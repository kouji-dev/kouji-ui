import {
  Directive,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_CONFIRM_POPUP,
  type KjConfirmPopupContext,
  type KjConfirmPopupDefaultFocus,
  nextConfirmPopupMessageId,
} from './confirm-popup.context';

/**
 * Root state container for the confirm popup family.
 *
 * Layers a confirm/cancel resolution contract on top of an overlay controller
 * so consumer button slots can resolve the popup with `true` or `false`
 * semantics. Pair with `[kjConfirmPopupTrigger]` (which composes
 * `[kjPopoverTrigger]`) on the same element so popover wiring lives in the
 * same injector.
 *
 * **Note (overlay primitives migration):** This wrapper now reads the
 * controller's open state directly. The previous `KJ_POPOVER` context was
 * removed; ARIA promotion to `alertdialog` happens in
 * `[kjConfirmPopupContent]`.
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjConfirmPopup]',
  standalone: true,
  exportAs: 'kjConfirmPopup',
  providers: [
    { provide: KJ_CONFIRM_POPUP, useExisting: KjConfirmPopup },
  ],
})
export class KjConfirmPopup implements KjConfirmPopupContext {
  /** The overlay controller, when the trigger sits on this very element. */
  private readonly selfController = inject(KjOverlayController, { optional: true });

  /**
   * The controller of a nested `[kjConfirmPopupTrigger]`. The documented
   * composition puts the trigger on a CHILD of `[kjConfirmPopup]` (see every
   * example), so the controller is NOT in this element's injector — without
   * this registration `close()` bailed out and `(kjConfirmed)` never fired.
   */
  private readonly registered = signal<KjOverlayController | null>(null);

  /** @internal — called by a nested `[kjConfirmPopupTrigger]`. */
  _registerController(c: KjOverlayController): void {
    this.registered.set(c);
  }

  private controllerOf(): KjOverlayController | null {
    return this.selfController ?? this.registered();
  }

  /** When `true`, the confirm action renders with destructive intent. */
  readonly kjDestructive = input<boolean, unknown>(false, {
    transform: booleanAttribute,
  });

  /** Where to place initial focus. Default `'cancel'`. */
  readonly kjDefaultFocus = input<KjConfirmPopupDefaultFocus>('cancel');

  /** Emits when the user confirms (clicks the confirm action). */
  readonly kjConfirmed = output<void>();

  /** Emits when the user cancels (cancel button, Escape, or outside-click). */
  readonly kjCancelled = output<void>();

  /** Emits the boolean result on every close. `true` confirm, `false` cancel. */
  readonly kjResult = output<boolean>();

  // ── KjConfirmPopupContext ──────────────────────────────────────────

  /** Open state forwarded from the underlying controller. */
  readonly open = computed(() => this.controllerOf()?.isOpen() ?? false);

  /** Whether the confirm action should render destructively. */
  readonly destructive = this.kjDestructive;

  /** Resolved default focus target. */
  readonly defaultFocus = this.kjDefaultFocus;

  /** Stable id used for the panel's `aria-describedby`. */
  readonly messageId = nextConfirmPopupMessageId();

  private resolved = false;
  private wasOpen = false;

  constructor() {
    // Bridge the controller's open signal into the resolution contract.
    effect(() => {
      const isOpen = this.controllerOf()?.isOpen() ?? false;
      if (isOpen && !this.wasOpen) {
        this.resolved = false;
      }
      if (!isOpen && this.wasOpen && !this.resolved) {
        this.resolved = true;
        this.kjCancelled.emit();
        this.kjResult.emit(false);
      }
      this.wasOpen = isOpen;
    });
  }

  /**
   * Close the popup with the given result. `true` confirms, `false` cancels.
   */
  close(result: boolean): void {
    const controller = this.controllerOf();
    if (!controller || !controller.isOpen()) return;
    this.resolved = true;
    if (result) this.kjConfirmed.emit();
    else this.kjCancelled.emit();
    this.kjResult.emit(result);
    controller.close('programmatic');
  }
}
