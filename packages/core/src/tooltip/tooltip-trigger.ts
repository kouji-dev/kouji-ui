import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
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
  KjOverlayRef,
  KjOverlayService,
} from '../primitives/overlay/overlay';
import { KjTooltipController } from './tooltip.controller';
import type {
  KjTooltipAlign,
  KjTooltipSide,
  KjTooltipTouchGestures,
} from './tooltip.context';

/**
 * Compound tooltip trigger.
 *
 * Pairs with a `<ng-template>` containing a `[kjTooltipContent]` element
 * (and optionally a `[kjTooltipArrow]`). The template is rendered into a
 * portal appended to `document.body` via `KjOverlayService.createFromTemplate`,
 * escaping any clipping ancestor (`overflow: hidden`, `transform`, `clip-path`).
 *
 * Owns the WCAG 1.4.13 contract via the shared {@link KjTooltipController}:
 * - hover / focus opens after `kjOpenDelayMs`
 * - mouse leaving *both* trigger and content closes after `kjCloseDelayMs`
 * - Escape closes (routed via `KjOverlayService` stack so nested overlays
 *   don't double-close)
 * - blur closes immediately
 * - long-press opens on touch devices
 * - the trigger's native `title` attribute is auto-stripped to prevent
 *   the chrome-default tooltip from appearing alongside ours
 *
 * Composes {@link KjAriaDescribedBy} so consumer-supplied `aria-describedby`
 * values stack with the auto-wired tooltip id.
 *
 * @example
 * ```html
 * <button
 *   kjButton
 *   [kjTooltipTriggerFor]="tip"
 *   [kjTooltipSide]="'top'"
 * >Save</button>
 *
 * <ng-template #tip>
 *   <div kjTooltipContent>
 *     Save the document
 *     <span kjTooltipArrow></span>
 *   </div>
 * </ng-template>
 * ```
 *
 * @category Core/Overlays
 * @doc
 * @doc-name tooltip
 */
@Directive({
  selector: '[kjTooltipTrigger], [kjTooltipTriggerFor]',
  standalone: true,
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
export class KjTooltipTrigger {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(KjOverlayService);
  private readonly aria = inject(KjAriaDescribedBy, { self: true });

  /** The shared timer / state controller. Provided by this directive's injector. */
  protected readonly controller = inject(KjTooltipController);

  /**
   * The template that supplies the tooltip content. Either a `TemplateRef`
   * (preferred — portal-mounts cleanly) or an `HTMLElement` (legacy — keeps
   * the panel as a sibling in the consumer's DOM, which can clip; supplied
   * for migration from the v0 sketch).
   */
  readonly kjTooltipTriggerFor = input.required<TemplateRef<unknown> | HTMLElement>();

  /** Disables the tooltip entirely. Reflects `data-disabled` on the trigger. */
  readonly kjTooltipDisabled = input<boolean>(false);

  /** Preferred side. Reflected on the content as `data-side`. */
  readonly kjTooltipSide = input<KjTooltipSide>('top');

  /** Cross-axis alignment. Reflected on the content as `data-align`. */
  readonly kjTooltipAlign = input<KjTooltipAlign>('center');

  /** Pixel gap between the trigger and the tooltip. */
  readonly kjTooltipOffset = input<number>(8);

  /** Whether to flip / shift on collision. */
  readonly kjAvoidCollisions = input<boolean>(true);

  /** Hover/focus open delay. Falls back to {@link KjTooltipController.defaults}. */
  readonly kjOpenDelayMs = input<number | undefined>(undefined);

  /** Mouseleave grace period. Falls back to controller defaults. */
  readonly kjCloseDelayMs = input<number | undefined>(undefined);

  /** Touch gesture mode. */
  readonly kjTouchGestures = input<KjTooltipTouchGestures>('auto');

  /** Long-press hold duration in ms. */
  readonly kjTouchHoldMs = input<number>(500);

  /** Two-way bindable open state. Setting to `true` opens immediately (skipping delays). */
  readonly kjOpen = model<boolean>(false);

  /** Convenience event paired with the `kjOpen` model. */
  readonly kjOpenChange = output<boolean>();

  private overlayRef: KjOverlayRef | undefined;
  private overlayHandle: ReturnType<KjOverlayService['register']> | undefined;
  private siblingHostShown = false;

  /** Computed: union of consumer-supplied describedby ids and the tooltip id (always set, per WAI-ARIA spec). */
  protected readonly mergedAriaDescribedBy = computed(() => {
    if (this.kjTooltipDisabled()) {
      // Disabled tooltip: don't add our id. Still expose any consumer-supplied describedby.
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
    // Wire the controller to read our inputs.
    this.controller.configure({
      disabled: () => this.kjTooltipDisabled(),
      openDelayMs: () => this.kjOpenDelayMs() ?? this.controller.defaults.openDelayMs,
      closeDelayMs: () => this.kjCloseDelayMs() ?? this.controller.defaults.closeDelayMs,
      touchGestures: () => this.kjTouchGestures(),
      touchHoldMs: () => this.kjTouchHoldMs(),
      onOpen: () => this.mountContent(),
      onClose: () => this.unmountContent(),
    });

    // Bidirectional sync between the controller's `open` signal and the
    // public `kjOpen` model. Each direction uses a dedicated tracking
    // variable to break the feedback loop that arises when both signals
    // start in the same state and a write to one triggers the effect for
    // the other to "correct" the value back.
    let lastControllerOpen = this.controller.open();
    effect(() => {
      const controllerOpen = this.controller.open();
      if (controllerOpen !== lastControllerOpen) {
        lastControllerOpen = controllerOpen;
        if (this.kjOpen() !== controllerOpen) this.kjOpen.set(controllerOpen);
        this.kjOpenChange.emit(controllerOpen);
      }
    });

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

    this.destroyRef.onDestroy(() => this.unmountContent());
  }

  /** The trigger element. Exposed for the controller / shorthand subclasses. */
  get triggerElement(): HTMLElement {
    return this.el.nativeElement;
  }

  // ── Mount / unmount ─────────────────────────────────────────────────

  private mountContent(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const tplOrEl = this.kjTooltipTriggerFor();

    if (tplOrEl instanceof TemplateRef) {
      this.overlayRef = this.overlay.createFromTemplate(tplOrEl, this.vcr);
      this.overlayRef.open();
    } else {
      // HTMLElement legacy mode: just toggle visibility on the consumer's element.
      // We don't portal it — that would yank it out of the consumer's DOM.
      tplOrEl.removeAttribute('hidden');
      this.siblingHostShown = true;
    }

    this.overlayHandle = this.overlay.register(
      `kj-tooltip-${this.controller.tooltipId}`,
      {
        onClose: () => this.controller.closeImmediate(),
        // Tooltips do not close on outside-click — `mouseleave` from
        // both the trigger and the content handles the relevant case.
        // Esc closes via the stack so nested overlays do not double-fire.
        closeOnEsc: true,
        closeOnOutside: false,
      },
    );
  }

  private unmountContent(): void {
    this.overlayHandle?.unregister();
    this.overlayHandle = undefined;

    if (this.overlayRef) {
      try { this.overlayRef.dispose(); } catch { /* ignore */ }
      this.overlayRef = undefined;
    }

    if (this.siblingHostShown) {
      const tplOrEl = (() => {
        try { return this.kjTooltipTriggerFor(); } catch { return undefined; }
      })();
      if (tplOrEl && !(tplOrEl instanceof TemplateRef)) {
        tplOrEl.setAttribute('hidden', '');
      }
      this.siblingHostShown = false;
    }
  }
}
