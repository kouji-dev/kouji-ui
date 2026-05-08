import {
  Directive,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { KjPopoverController } from './popover.controller';
import {
  KJ_POPOVER,
  type KjAutoFocusEvent,
  type KjPopoverAlign,
  type KjPopoverContext,
  type KjPopoverCloseEvent,
  type KjPopoverCloseReason,
  type KjPopoverSide,
  type KjPopoverTriggerEvent,
} from './popover.context';

/**
 * Root popover state container.
 *
 * Provides the `KJ_POPOVER` context shared with `[kjPopoverTrigger]`,
 * `[kjPopoverContent]`, `[kjPopoverArrow]`, `[kjPopoverTitle]` and
 * `[kjPopoverClose]`. Owns the `kjOpen` model and emits the family's
 * cancellable lifecycle outputs (`kjCloseRequested`, `kjOpenAutoFocus`,
 * `kjCloseAutoFocus`).
 *
 * The directive sets no host attributes — it is a transparent state
 * container. Place it on whatever element naturally groups the trigger and
 * the content (typically the same parent that wraps both).
 *
 * **Compound shape (default):**
 *
 * ```html
 * <div kjPopover>
 *   <button kjPopoverTrigger>Open</button>
 *   <ng-template kjPopoverContent>
 *     <h3 kjPopoverTitle>Profile</h3>
 *     <button kjPopoverClose>Close</button>
 *   </ng-template>
 * </div>
 * ```
 *
 * For a flat ergonomic without an outer wrapper see
 * `[kjPopoverTriggerFor]` on `KjPopoverTrigger`.
 *
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file popover.example.ts
 *    @doc-theme retro
 *      @doc-file popover.retro.example.ts
 *    @doc-theme finance
 *      @doc-file popover.finance.example.ts
 * @category Core/Overlays
 * @doc-name popover
 * @doc-description Root popover state container — provides the `KJ_POPOVER` context to trigger, content, and close directives and owns the `kjOpen` model along with cancellable open/close lifecycle outputs.
 * @doc-is-main
 */
@Directive({
  selector: '[kjPopover]',
  standalone: true,
  exportAs: 'kjPopover',
  providers: [
    KjPopoverController,
    { provide: KJ_POPOVER, useExisting: KjPopover },
  ],
})
export class KjPopover implements KjPopoverContext {
  /** The shared controller; provided in this directive's injector. */
  readonly controller = inject(KjPopoverController);

  /** Preferred side for the panel. Reflected as `data-side` on content. Default `'bottom'`. */
  readonly kjPopoverSide = input<KjPopoverSide>(this.controller.defaults.side);

  /** Cross-axis alignment. Reflected as `data-align`. Default `'start'`. */
  readonly kjPopoverAlign = input<KjPopoverAlign>(this.controller.defaults.align);

  /** Pixel gap between trigger and panel. Default `8`. */
  readonly kjPopoverOffset = input<number>(this.controller.defaults.offset);

  /** Whether to flip / shift on collision. Default `true`. */
  readonly kjAvoidCollisions = input<boolean>(true);

  /** Pixel viewport padding for collision detection. Default `8`. */
  readonly kjCollisionPadding = input<number>(this.controller.defaults.collisionPadding);

  /** How the popover is opened. Default `'click'`. */
  readonly kjTriggerEvent = input<KjPopoverTriggerEvent>(this.controller.defaults.triggerEvent);

  /** Two-way bindable open state. */
  readonly kjOpen = model<boolean>(false);

  /** Convenience event paired with the `kjOpen` model. */
  readonly kjOpenChange = output<boolean>();

  /** Emitted before each close attempt. Cancellable via `event.preventDefault()`. */
  readonly kjCloseRequested = output<KjPopoverCloseEvent>();

  /** Emitted before auto-focus runs on open. Cancellable. */
  readonly kjOpenAutoFocus = output<KjAutoFocusEvent>();

  /** Emitted before focus restoration runs on close. Cancellable. */
  readonly kjCloseAutoFocus = output<KjAutoFocusEvent>();

  // ── KjPopoverContext fields (sourced from controller) ───────────────

  readonly open = this.controller.open;
  readonly popoverId = this.controller.popoverId;
  readonly titleId = this.controller.titleId;
  readonly modal = this.controller.modal;
  readonly triggerElement = this.controller.triggerElement;

  constructor() {
    this.controller.configure({
      emitOpenChange: (v) => {
        if (this.kjOpen() !== v) this.kjOpen.set(v);
        this.kjOpenChange.emit(v);
      },
      emitCloseRequested: (ev) => this.kjCloseRequested.emit(ev),
      emitOpenAutoFocus: (ev) => this.kjOpenAutoFocus.emit(ev),
      emitCloseAutoFocus: (ev) => this.kjCloseAutoFocus.emit(ev),
    });

    let lastModelOpen = this.kjOpen();
    effect(() => {
      const wanted = this.kjOpen();
      if (wanted === lastModelOpen) return;
      lastModelOpen = wanted;
      this.controller.syncFromModel(wanted);
    });
  }

  // ── KjPopoverContext mutations ──────────────────────────────────────

  show(): void {
    this.controller.show();
  }

  hide(reason: KjPopoverCloseReason): void {
    this.controller.hide(reason);
  }

  toggle(): void {
    this.controller.toggle();
  }

  registerTitleId(id: string): void {
    this.controller.registerTitleId(id);
  }

  unregisterTitleId(id: string): void {
    this.controller.unregisterTitleId(id);
  }

  captureTriggerFocus(el: HTMLElement): void {
    this.controller.captureTriggerFocus(el);
  }

  restoreTriggerFocus(): void {
    this.controller.restoreTriggerFocus();
  }
}
