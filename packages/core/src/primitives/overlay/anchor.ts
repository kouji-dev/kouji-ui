import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Side on which the floating element is placed relative to its anchor. */
export type KjAnchorSide = 'top' | 'bottom' | 'left' | 'right';

/** Alignment of the floating element along the cross-axis of its side. */
export type KjAnchorAlign = 'start' | 'center' | 'end';

/** Resolved (post-flip / post-shift) placement of the floating element. */
export interface KjAnchorPlacement {
  side: KjAnchorSide;
  align: KjAnchorAlign;
}

/** Counter for unique `anchor-name` ident generation when the CSS path is used. */
let _anchorIdCounter = 0;

/**
 * Connected-positioning primitive shared by tooltips, popovers, dropdown
 * menus, confirm popups, speed dials and comboboxes.
 *
 * Place this directive on the **floating element** (the panel that should
 * be anchored to a trigger). Provide the trigger via `[kjAnchorTo]`.
 *
 * Two engines, picked at runtime via feature detection:
 *
 * 1. **Preferred — CSS Anchor Positioning.** When
 *    `CSS.supports('anchor-name', '--x')` is true the directive sets a
 *    generated `anchor-name` on the trigger and `position-anchor` +
 *    `position-area` on the floating element. The browser performs flip /
 *    shift via `position-try-fallbacks` declared in consumer CSS.
 * 2. **Fallback — manual math.** Uses `getBoundingClientRect()` on both
 *    elements and the visual viewport to compute `left`/`top` in pixels.
 *    Recomputes on `resize`, `scroll` (capture, throttled via
 *    `requestAnimationFrame`) and on `ResizeObserver` notifications for
 *    both elements.
 *
 * Either way the resolved post-flip side / align is exposed via the
 * {@link placement} signal so consumers can render arrows or reflect
 * `data-side` / `data-align` (which the directive already does itself on
 * its host element).
 *
 * SSR-safe: all browser APIs are guarded with `isPlatformBrowser`. On the
 * server the directive renders nothing and the placement defaults to the
 * requested side / align.
 *
 * No CDK, no floating-ui — pure native DOM APIs.
 *
 * @example
 * ```html
 * <button #trigger>Open</button>
 * <div
 *   kjAnchor
 *   [kjAnchorTo]="trigger"
 *   kjAnchorSide="bottom"
 *   kjAnchorAlign="center"
 *   [kjAnchorOffset]="8"
 * >...</div>
 * ```
 * @category Core/Primitives
 * @doc
 * @doc-name overlay
 * @doc-description Connected-positioning primitive for floating elements — prefers CSS Anchor Positioning when supported and falls back to manual `getBoundingClientRect` math, exposing the resolved placement via the `placement` signal.
 * @doc-is-main
 */
@Directive({
  selector: '[kjAnchor]',
  standalone: true,
  exportAs: 'kjAnchor',
  host: {
    '[attr.data-side]': 'placement().side',
    '[attr.data-align]': 'placement().align',
  },
})
export class KjAnchor {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Trigger / reference element the floating element is anchored to. */
  readonly kjAnchorTo = input<HTMLElement | undefined>(undefined);

  /** Preferred side relative to the anchor. Defaults to `'bottom'`. */
  readonly kjAnchorSide = input<KjAnchorSide>('bottom');

  /** Alignment along the cross-axis of the side. Defaults to `'center'`. */
  readonly kjAnchorAlign = input<KjAnchorAlign>('center');

  /** Pixel gap between the anchor and the floating element. Defaults to `8`. */
  readonly kjAnchorOffset = input<number>(8);

  /** Whether to flip to the opposite side when the preferred side overflows. Defaults to `true`. */
  readonly kjAnchorFlip = input<boolean>(true);

  /** Whether to shift along the cross-axis to keep the floating element on-screen. Defaults to `true`. */
  readonly kjAnchorShift = input<boolean>(true);

  private readonly _placement = signal<KjAnchorPlacement>({
    side: 'bottom',
    align: 'center',
  });

  /** Resolved placement after any flip / shift adjustments. */
  readonly placement = this._placement.asReadonly();

  /** Convenience signal exposing the resolved side. */
  readonly side = computed(() => this._placement().side);

  /** Convenience signal exposing the resolved align. */
  readonly align = computed(() => this._placement().align);

  /** Unique anchor-name ident assigned to the trigger when CSS path is active. */
  private readonly _anchorIdent = `--kj-anchor-${++_anchorIdCounter}`;

  /** Set true once the first afterNextRender has run; gates DOM-touching effect work. */
  private readonly _ready = signal(false);

  private _cleanupListeners: (() => void) | undefined;
  private _resizeObserver: ResizeObserver | undefined;
  private _rafId: number | undefined;
  private _lastTrigger: HTMLElement | undefined;
  private _useCssEngine = false;

  constructor() {
    // Reactive positioning effect. Tracks all inputs; reruns on any change.
    // Body is a no-op until afterNextRender flips _ready, so SSR never
    // touches the DOM.
    effect(() => {
      const trigger = this.kjAnchorTo();
      const side = this.kjAnchorSide();
      const align = this.kjAnchorAlign();
      const offset = this.kjAnchorOffset();
      const flip = this.kjAnchorFlip();
      const shift = this.kjAnchorShift();

      // Always reflect requested placement immediately so the host's
      // [attr.data-side] / [attr.data-align] are populated even before the
      // first afterNextRender or when running on the server.
      this._placement.set({ side, align });

      if (!this._ready()) return;
      if (!isPlatformBrowser(this.platformId)) return;

      this._teardownTrigger();

      if (!trigger) {
        this._clearFloatingStyles();
        return;
      }

      this._lastTrigger = trigger;

      if (this._useCssEngine) {
        this._applyCssEngine(trigger, side, align, offset);
        // The CSS engine handles flip/shift natively via position-try-fallbacks
        // declared in consumer stylesheets. We expose the requested placement
        // here; consumers reading the *resolved* side from the browser would
        // need to inspect computed style.
        return;
      }

      this._applyManualEngine(trigger, side, align, offset, flip, shift);
    });

    if (!isPlatformBrowser(this.platformId)) {
      // SSR: skip all DOM work. The effect above keeps placement in sync
      // with the requested inputs without touching the DOM.
      return;
    }

    afterNextRender(() => {
      this._useCssEngine = this._supportsCssAnchor();
      this._ready.set(true);
    });

    this.destroyRef.onDestroy(() => this._teardownTrigger());
  }

  /** Detect support for CSS Anchor Positioning. Mockable in tests via `CSS.supports`. */
  private _supportsCssAnchor(): boolean {
    try {
      return typeof CSS !== 'undefined'
        && typeof CSS.supports === 'function'
        && CSS.supports('anchor-name', '--x');
    } catch {
      return false;
    }
  }

  // ─── CSS Anchor Positioning engine ──────────────────────────────────

  private _applyCssEngine(
    trigger: HTMLElement,
    side: KjAnchorSide,
    align: KjAnchorAlign,
    offset: number,
  ): void {
    const floating = this.el.nativeElement;

    // Tag the trigger with a unique anchor-name. setProperty avoids clobbering
    // any anchor-name the consumer may already have set via other CSS.
    trigger.style.setProperty('anchor-name', this._anchorIdent);

    floating.style.setProperty('position-anchor', this._anchorIdent);
    floating.style.setProperty('position', 'fixed');
    floating.style.setProperty('position-area', this._cssPositionArea(side, align));
    floating.style.setProperty('margin', `${offset}px`);
  }

  /** Translate (side, align) into a `position-area` keyword pair. */
  private _cssPositionArea(side: KjAnchorSide, align: KjAnchorAlign): string {
    if (side === 'top' || side === 'bottom') {
      const cross = align === 'start' ? 'span-right'
                  : align === 'end'   ? 'span-left'
                                      : 'center';
      return `${side} ${cross}`;
    }
    const cross = align === 'start' ? 'span-bottom'
                : align === 'end'   ? 'span-top'
                                    : 'center';
    return `${side} ${cross}`;
  }

  // ─── Manual fallback engine ─────────────────────────────────────────

  private _applyManualEngine(
    trigger: HTMLElement,
    side: KjAnchorSide,
    align: KjAnchorAlign,
    offset: number,
    flip: boolean,
    shift: boolean,
  ): void {
    const floating = this.el.nativeElement;
    floating.style.setProperty('position', 'fixed');

    const reposition = () => this._computeManual(trigger, side, align, offset, flip, shift);

    // Initial placement.
    reposition();

    const onScrollOrResize = () => {
      if (this._rafId !== undefined) return;
      this._rafId = requestAnimationFrame(() => {
        this._rafId = undefined;
        reposition();
      });
    };

    window.addEventListener('resize', onScrollOrResize);
    // capture: catch scroll on any ancestor scroll container.
    window.addEventListener('scroll', onScrollOrResize, true);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onScrollOrResize);
      resizeObserver.observe(trigger);
      resizeObserver.observe(floating);
      this._resizeObserver = resizeObserver;
    }

    this._cleanupListeners = () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      if (this._rafId !== undefined) {
        cancelAnimationFrame(this._rafId);
        this._rafId = undefined;
      }
      resizeObserver?.disconnect();
      this._resizeObserver = undefined;
    };
  }

  private _computeManual(
    trigger: HTMLElement,
    side: KjAnchorSide,
    align: KjAnchorAlign,
    offset: number,
    flip: boolean,
    shift: boolean,
  ): void {
    const floating = this.el.nativeElement;
    const triggerRect = trigger.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let resolvedSide = side;

    if (flip) {
      const fits = (s: KjAnchorSide): boolean => {
        switch (s) {
          case 'top':    return triggerRect.top - offset - floatingRect.height >= 0;
          case 'bottom': return triggerRect.bottom + offset + floatingRect.height <= vh;
          case 'left':   return triggerRect.left - offset - floatingRect.width >= 0;
          case 'right':  return triggerRect.right + offset + floatingRect.width <= vw;
        }
      };
      if (!fits(side)) {
        const opposite: KjAnchorSide =
          side === 'top'    ? 'bottom' :
          side === 'bottom' ? 'top'    :
          side === 'left'   ? 'right'  :
                              'left';
        if (fits(opposite)) {
          resolvedSide = opposite;
        }
      }
    }

    let left = 0;
    let top = 0;

    switch (resolvedSide) {
      case 'top':
        top = triggerRect.top - floatingRect.height - offset;
        left = this._alignMain(triggerRect.left, triggerRect.width, floatingRect.width, align);
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = this._alignMain(triggerRect.left, triggerRect.width, floatingRect.width, align);
        break;
      case 'left':
        left = triggerRect.left - floatingRect.width - offset;
        top = this._alignMain(triggerRect.top, triggerRect.height, floatingRect.height, align);
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = this._alignMain(triggerRect.top, triggerRect.height, floatingRect.height, align);
        break;
    }

    if (shift) {
      if (resolvedSide === 'top' || resolvedSide === 'bottom') {
        left = Math.max(0, Math.min(left, vw - floatingRect.width));
      } else {
        top = Math.max(0, Math.min(top, vh - floatingRect.height));
      }
    }

    floating.style.setProperty('left', `${left}px`);
    floating.style.setProperty('top', `${top}px`);

    this._placement.set({ side: resolvedSide, align });
  }

  private _alignMain(
    triggerStart: number,
    triggerSize: number,
    floatingSize: number,
    align: KjAnchorAlign,
  ): number {
    switch (align) {
      case 'start':  return triggerStart;
      case 'end':    return triggerStart + triggerSize - floatingSize;
      case 'center': return triggerStart + (triggerSize - floatingSize) / 2;
    }
  }

  private _teardownTrigger(): void {
    this._cleanupListeners?.();
    this._cleanupListeners = undefined;
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;

    if (this._lastTrigger) {
      // Only clear the property we set; leave any other anchor-name alone.
      const current = this._lastTrigger.style.getPropertyValue('anchor-name');
      if (current === this._anchorIdent) {
        this._lastTrigger.style.removeProperty('anchor-name');
      }
      this._lastTrigger = undefined;
    }
  }

  private _clearFloatingStyles(): void {
    const floating = this.el.nativeElement;
    floating.style.removeProperty('position');
    floating.style.removeProperty('position-anchor');
    floating.style.removeProperty('position-area');
    floating.style.removeProperty('left');
    floating.style.removeProperty('top');
    floating.style.removeProperty('margin');
  }
}
