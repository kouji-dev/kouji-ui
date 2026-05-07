import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjTooltipController } from './tooltip.controller';
import type {
  KjTooltipAlign,
  KjTooltipSide,
} from './tooltip.context';

/**
 * The floating tooltip panel.
 *
 * Hosts `role="tooltip"`, an auto-generated `id` used for the trigger's
 * `aria-describedby`, and the `mouseenter` / `mouseleave` listeners that
 * implement the WCAG 1.4.13 *hoverable* contract: moving the cursor onto
 * the tooltip does **not** dismiss it.
 *
 * Owns connected-positioning math equivalent to
 * {@link import('../primitives/overlay/anchor').KjAnchor} — it reads the
 * trigger element from the parent {@link KjTooltipController} and writes
 * `position: fixed; left/top` on its host on every open + on resize / scroll.
 * Default `kjTooltipSide` is `'top'` (per the analysis), overriding the
 * `KjAnchor` primitive's `'bottom'` default.
 *
 * Mounted via `KjOverlayService.createFromTemplate` — never as a sibling of
 * the trigger in the consumer's DOM. This escapes any ancestor
 * `overflow: hidden` / `transform` / `clip-path` clipping container.
 *
 * **Content rule:** non-interactive nodes only. Buttons, links, and form
 * controls inside `[kjTooltipContent]` are unreachable to AT under
 * `role="tooltip"` — if you need interactive content, use `[kjPopover]`.
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjTooltipContent]',
  standalone: true,
  exportAs: 'kjTooltipContent',
  host: {
    'role': 'tooltip',
    '[attr.id]': 'tooltipId',
    '[attr.data-state]': 'controller.open() ? "open" : "closed"',
    '[attr.data-side]': 'placement().side',
    '[attr.data-align]': 'placement().align',
    '[attr.hidden]': 'controller.open() ? null : ""',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
  },
})
export class KjTooltipContent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** The shared controller hosted on the parent trigger. */
  protected readonly controller = inject(KjTooltipController);

  /** Preferred side. Defaults to `'top'` (per the tooltip analysis). */
  readonly kjTooltipSide = input<KjTooltipSide>('top');

  /** Cross-axis alignment. Defaults to `'center'`. */
  readonly kjTooltipAlign = input<KjTooltipAlign>('center');

  /** Pixel offset between trigger and tooltip. Defaults to `8`. */
  readonly kjTooltipOffset = input<number>(8);

  /** Whether to flip / shift on collision. Defaults to `true`. */
  readonly kjAvoidCollisions = input<boolean>(true);

  /** Resolved (post-flip) placement. Reflected to host as `data-side` / `data-align`. */
  readonly placement = signal<{ side: KjTooltipSide; align: KjTooltipAlign }>({
    side: 'top',
    align: 'center',
  });

  /** Auto-generated unique id wired to the trigger's `aria-describedby`. */
  get tooltipId(): string {
    return this.controller.tooltipId;
  }

  /** The host element of the floating panel. Used by tests / wrapper styling. */
  get nativeElement(): HTMLElement {
    return this.el.nativeElement;
  }

  private _ready = false;
  private _cleanupListeners: (() => void) | undefined;
  private _resizeObserver: ResizeObserver | undefined;
  private _rafId: number | undefined;

  constructor() {
    // Reflect the requested side / align immediately for SSR.
    effect(() => {
      const side = this.kjTooltipSide();
      const align = this.kjTooltipAlign();
      this.placement.set({ side, align });
      if (this._ready && isPlatformBrowser(this.platformId)) {
        this.reposition();
      }
    });

    // Reposition when the controller flips open. Cheap — gated by `open()`.
    effect(() => {
      const open = this.controller.open();
      if (open && this._ready && isPlatformBrowser(this.platformId)) {
        // Defer one frame so the host has been laid out before we measure.
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => this.reposition());
        } else {
          this.reposition();
        }
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        this._ready = true;
        this.installListeners();
        this.reposition();
      });
    }

    this.destroyRef.onDestroy(() => {
      this._cleanupListeners?.();
      this._cleanupListeners = undefined;
      this._resizeObserver?.disconnect();
      this._resizeObserver = undefined;
      if (this._rafId !== undefined) {
        cancelAnimationFrame(this._rafId);
        this._rafId = undefined;
      }
    });
  }

  protected onMouseEnter(): void {
    this.controller.setPointerOnContent(true);
  }

  protected onMouseLeave(): void {
    this.controller.setPointerOnContent(false);
  }

  // ── Positioning (manual fallback only; CSS-anchor path lives on the
  // KjAnchor primitive used by the rest of the codebase. The tooltip uses
  // the manual math directly so it can be driven from controller state
  // without needing the consumer to bind `kjAnchorTo` on the template.) ──

  private installListeners(): void {
    const onScrollOrResize = () => {
      if (this._rafId !== undefined) return;
      this._rafId = requestAnimationFrame(() => {
        this._rafId = undefined;
        this.reposition();
      });
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(onScrollOrResize);
      ro.observe(this.el.nativeElement);
      try { ro.observe(this.controller.triggerElement); } catch { /* ignore */ }
      this._resizeObserver = ro;
    }

    this._cleanupListeners = () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }

  private reposition(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const trigger = this.controller.triggerElement;
    const floating = this.el.nativeElement;
    if (!trigger || !floating) return;

    floating.style.setProperty('position', 'fixed');

    const triggerRect = trigger.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const side = this.kjTooltipSide();
    const align = this.kjTooltipAlign();
    const offset = this.kjTooltipOffset();
    const avoidCollisions = this.kjAvoidCollisions();

    let resolvedSide: KjTooltipSide = side;

    if (avoidCollisions) {
      const fits = (s: KjTooltipSide): boolean => {
        switch (s) {
          case 'top':    return triggerRect.top - offset - floatingRect.height >= 0;
          case 'bottom': return triggerRect.bottom + offset + floatingRect.height <= vh;
          case 'left':   return triggerRect.left - offset - floatingRect.width >= 0;
          case 'right':  return triggerRect.right + offset + floatingRect.width <= vw;
        }
      };
      if (!fits(side)) {
        const opposite: KjTooltipSide =
          side === 'top'    ? 'bottom' :
          side === 'bottom' ? 'top'    :
          side === 'left'   ? 'right'  :
                              'left';
        if (fits(opposite)) resolvedSide = opposite;
      }
    }

    let left = 0;
    let top = 0;
    const alignMain = (start: number, size: number, fSize: number): number => {
      switch (align) {
        case 'start':  return start;
        case 'end':    return start + size - fSize;
        case 'center': return start + (size - fSize) / 2;
      }
    };

    switch (resolvedSide) {
      case 'top':
        top = triggerRect.top - floatingRect.height - offset;
        left = alignMain(triggerRect.left, triggerRect.width, floatingRect.width);
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = alignMain(triggerRect.left, triggerRect.width, floatingRect.width);
        break;
      case 'left':
        left = triggerRect.left - floatingRect.width - offset;
        top = alignMain(triggerRect.top, triggerRect.height, floatingRect.height);
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = alignMain(triggerRect.top, triggerRect.height, floatingRect.height);
        break;
    }

    if (avoidCollisions) {
      if (resolvedSide === 'top' || resolvedSide === 'bottom') {
        left = Math.max(0, Math.min(left, vw - floatingRect.width));
      } else {
        top = Math.max(0, Math.min(top, vh - floatingRect.height));
      }
    }

    floating.style.setProperty('left', `${left}px`);
    floating.style.setProperty('top', `${top}px`);

    this.placement.set({ side: resolvedSide, align });
  }
}
