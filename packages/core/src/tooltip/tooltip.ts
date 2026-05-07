import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjAriaDescribedBy } from '../a11y/aria-describedby';
import {
  KjOverlayHandle,
  KjOverlayService,
} from '../primitives/overlay/overlay';
import { KjTooltipController } from './tooltip.controller';
import type {
  KjTooltipAlign,
  KjTooltipSide,
  KjTooltipTouchGestures,
} from './tooltip.context';

/**
 * Shorthand tooltip — single-attribute form for the 80% case.
 *
 * `<button kjButton aria-label="Save" [kjTooltip]="'Save document'">…</button>`
 *
 * Internally uses the same {@link KjTooltipController} and `KjOverlayService`
 * machinery as the compound `[kjTooltipTrigger]` shape: hover / focus opens
 * after `kjOpenDelayMs`, mouseleave closes after `kjCloseDelayMs`, Escape
 * dismisses, blur closes, the trigger's native `title` attribute is auto-
 * stripped, and long-press opens on touch devices.
 *
 * The shorthand does not portal-mount via `KjOverlayService.createFromTemplate`
 * — instead it constructs a plain `<div role="tooltip">` element via DOM and
 * appends it to `document.body` directly, escaping clipping containers the
 * same way. The Esc / outside-click coordination is still wired through
 * `KjOverlayService.register`.
 *
 * Plain text only — HTML in the input string is rendered as `textContent`,
 * never as markup. For rich content (icons, multi-line layouts) use the
 * compound `[kjTooltipTrigger]` form.
 *
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file tooltip.example.ts
 *    @doc-theme retro
 *      @doc-file tooltip.retro.example.ts
 *    @doc-theme finance
 *      @doc-file tooltip.finance.example.ts
 *  @doc-example Placements
 *    @doc-file tooltip.placements.example.ts
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjTooltip]',
  standalone: true,
  exportAs: 'kjTooltip',
  providers: [KjTooltipController],
  hostDirectives: [
    {
      directive: KjAriaDescribedBy,
      inputs: ['kjDescribedBy'],
    },
  ],
  host: {
    '[attr.aria-describedby]': 'mergedAriaDescribedBy()',
    '[attr.data-disabled]': 'kjTooltipDisabled() ? "" : null',
    '(mouseenter)': 'controller.onPointerEnter()',
    '(mouseleave)': 'controller.onPointerLeave()',
    '(focus)': 'controller.onFocus()',
    '(blur)': 'controller.onBlur()',
    '(touchstart)': 'controller.onTouchStart()',
    '(touchend)': 'controller.onTouchEnd()',
    '(touchcancel)': 'controller.onTouchCancel()',
  },
})
export class KjTooltip {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(KjOverlayService);
  private readonly aria = inject(KjAriaDescribedBy, { self: true });

  /** The shared timer / state controller. Provided by this directive's injector. */
  protected readonly controller = inject(KjTooltipController);

  /** The plain-text label. Empty string disables. HTML is escaped (rendered as text). */
  readonly kjTooltip = input.required<string>();

  /** Disables the tooltip entirely. Reflects `data-disabled` on the trigger. */
  readonly kjTooltipDisabled = input<boolean>(false);

  /** Preferred side relative to the trigger. */
  readonly kjTooltipSide = input<KjTooltipSide>('top');

  /** Cross-axis alignment. */
  readonly kjTooltipAlign = input<KjTooltipAlign>('center');

  /** Pixel gap between trigger and tooltip. */
  readonly kjTooltipOffset = input<number>(8);

  /** Whether to flip / shift on collision. */
  readonly kjAvoidCollisions = input<boolean>(true);

  /** Hover/focus open delay. Falls back to the controller's defaults. */
  readonly kjOpenDelayMs = input<number | undefined>(undefined);

  /** Mouseleave grace period. Falls back to the controller's defaults. */
  readonly kjCloseDelayMs = input<number | undefined>(undefined);

  /** Touch gestures policy. */
  readonly kjTouchGestures = input<KjTooltipTouchGestures>('auto');

  /** Long-press hold duration in milliseconds. */
  readonly kjTouchHoldMs = input<number>(500);

  /** Optional class hook for the styled wrapper. */
  readonly kjPanelClass = input<string | string[]>('');

  /** Two-way bindable open state. Setting to `true` opens immediately. */
  readonly kjOpen = model<boolean>(false);

  /** Convenience event paired with the `kjOpen` model. */
  readonly kjOpenChange = output<boolean>();

  /** The runtime-created tooltip panel element (only present while open). */
  private panel: HTMLElement | undefined;
  private overlayHandle: KjOverlayHandle | undefined;
  private cleanupReposition: (() => void) | undefined;
  private rafId: number | undefined;

  /** Effective merged aria-describedby. Always wired (even when closed) per WAI-ARIA. */
  protected readonly mergedAriaDescribedBy = computed(() => {
    if (this.kjTooltipDisabled() || this.kjTooltip().length === 0) {
      const consumer = this.aria.ariaDescribedBy();
      return consumer ?? null;
    }
    const consumer = this.aria.ariaDescribedBy();
    const ids = consumer ? consumer.split(' ').filter(Boolean) : [];
    if (!ids.includes(this.controller.tooltipId)) {
      ids.push(this.controller.tooltipId);
    }
    return ids.length ? ids.join(' ') : null;
  });

  constructor() {
    this.controller.configure({
      disabled: () => this.kjTooltipDisabled() || this.kjTooltip().length === 0,
      openDelayMs: () => this.kjOpenDelayMs() ?? this.controller.defaults.openDelayMs,
      closeDelayMs: () => this.kjCloseDelayMs() ?? this.controller.defaults.closeDelayMs,
      touchGestures: () => this.kjTouchGestures(),
      touchHoldMs: () => this.kjTouchHoldMs(),
      onOpen: () => this.mountPanel(),
      onClose: () => this.unmountPanel(),
    });

    // Keep the panel's text in sync with the input while open.
    effect(() => {
      const text = this.kjTooltip();
      if (this.panel) this.panel.textContent = text;
    });

    // Re-position when relevant inputs change while open.
    effect(() => {
      void this.kjTooltipSide();
      void this.kjTooltipAlign();
      void this.kjTooltipOffset();
      void this.kjAvoidCollisions();
      if (this.panel) this.scheduleReposition();
    });

    // Bidirectional sync between the controller's `open` signal and the
    // public `kjOpen` model. We use a single effect that prefers controller
    // truth — when the controller transitions, it writes to the model and
    // emits the convenience output. Programmatic writes from consumers are
    // observed in a *separate* untracked read to avoid feedback loops.
    let lastControllerOpen = this.controller.open();
    effect(() => {
      const controllerOpen = this.controller.open();
      if (controllerOpen !== lastControllerOpen) {
        lastControllerOpen = controllerOpen;
        if (this.kjOpen() !== controllerOpen) {
          this.kjOpen.set(controllerOpen);
        }
        this.kjOpenChange.emit(controllerOpen);
      }
    });

    // Sync kjOpen model -> controller (consumer-driven open / close).
    let lastModelOpen = this.kjOpen();
    effect(() => {
      const wanted = this.kjOpen();
      if (wanted === lastModelOpen) return;
      lastModelOpen = wanted;
      const actual = this.controller.open();
      if (wanted === actual) return;
      if (wanted) this.controller.openImmediate();
      else this.controller.closeImmediate();
    });

    this.destroyRef.onDestroy(() => this.unmountPanel());
  }

  // ── Panel lifecycle ─────────────────────────────────────────────────

  private mountPanel(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.panel) return;

    const panel = document.createElement('div');
    panel.setAttribute('role', 'tooltip');
    panel.setAttribute('id', this.controller.tooltipId);
    panel.setAttribute('data-state', 'open');
    panel.setAttribute('data-kj-tooltip', '');
    panel.style.position = 'fixed';
    panel.style.left = '0';
    panel.style.top = '0';
    panel.style.pointerEvents = 'auto';
    panel.textContent = this.kjTooltip();

    const cls = this.kjPanelClass();
    if (cls) {
      const list = Array.isArray(cls) ? cls : [cls];
      list.filter(Boolean).forEach(c => panel.classList.add(c));
    }

    // Hover-on-tooltip listeners: implement WCAG 1.4.13 *hoverable*.
    panel.addEventListener('mouseenter', () => this.controller.setPointerOnContent(true));
    panel.addEventListener('mouseleave', () => this.controller.setPointerOnContent(false));

    document.body.appendChild(panel);
    this.panel = panel;

    // Reposition immediately and on resize / scroll / observed size changes.
    this.scheduleReposition();
    this.installRepositionListeners();

    this.overlayHandle = this.overlay.register(
      `kj-tooltip-${this.controller.tooltipId}`,
      {
        onClose: () => this.controller.closeImmediate(),
        closeOnEsc: true,
        closeOnOutside: false,
      },
    );
  }

  private unmountPanel(): void {
    this.overlayHandle?.unregister();
    this.overlayHandle = undefined;

    if (this.cleanupReposition) {
      this.cleanupReposition();
      this.cleanupReposition = undefined;
    }
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }

    if (this.panel) {
      try { this.panel.remove(); } catch { /* ignore */ }
      this.panel = undefined;
    }
  }

  private installRepositionListeners(): void {
    if (!isPlatformBrowser(this.platformId) || !this.panel) return;
    const onScrollOrResize = () => this.scheduleReposition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onScrollOrResize);
      ro.observe(this.el.nativeElement);
      ro.observe(this.panel);
    }

    this.cleanupReposition = () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      ro?.disconnect();
    };
  }

  private scheduleReposition(): void {
    if (!this.panel) return;
    if (this.rafId !== undefined) return;
    if (typeof requestAnimationFrame === 'undefined') {
      this.reposition();
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = undefined;
      this.reposition();
    });
  }

  private reposition(): void {
    const panel = this.panel;
    if (!panel) return;
    const trigger = this.el.nativeElement;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const side = this.kjTooltipSide();
    const align = this.kjTooltipAlign();
    const offset = this.kjTooltipOffset();
    const avoid = this.kjAvoidCollisions();

    let resolved: KjTooltipSide = side;
    if (avoid) {
      const fits = (s: KjTooltipSide): boolean => {
        switch (s) {
          case 'top':    return triggerRect.top - offset - panelRect.height >= 0;
          case 'bottom': return triggerRect.bottom + offset + panelRect.height <= vh;
          case 'left':   return triggerRect.left - offset - panelRect.width >= 0;
          case 'right':  return triggerRect.right + offset + panelRect.width <= vw;
        }
      };
      if (!fits(side)) {
        const opposite: KjTooltipSide =
          side === 'top'    ? 'bottom' :
          side === 'bottom' ? 'top'    :
          side === 'left'   ? 'right'  :
                              'left';
        if (fits(opposite)) resolved = opposite;
      }
    }

    const alignMain = (start: number, size: number, fSize: number): number => {
      switch (align) {
        case 'start':  return start;
        case 'end':    return start + size - fSize;
        case 'center': return start + (size - fSize) / 2;
      }
    };

    let left = 0;
    let top = 0;
    switch (resolved) {
      case 'top':
        top = triggerRect.top - panelRect.height - offset;
        left = alignMain(triggerRect.left, triggerRect.width, panelRect.width);
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = alignMain(triggerRect.left, triggerRect.width, panelRect.width);
        break;
      case 'left':
        left = triggerRect.left - panelRect.width - offset;
        top = alignMain(triggerRect.top, triggerRect.height, panelRect.height);
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = alignMain(triggerRect.top, triggerRect.height, panelRect.height);
        break;
    }

    if (avoid) {
      if (resolved === 'top' || resolved === 'bottom') {
        left = Math.max(0, Math.min(left, vw - panelRect.width));
      } else {
        top = Math.max(0, Math.min(top, vh - panelRect.height));
      }
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.setAttribute('data-side', resolved);
    panel.setAttribute('data-align', align);
  }
}
