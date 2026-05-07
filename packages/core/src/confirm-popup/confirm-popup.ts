import {
  Directive,
  booleanAttribute,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { KjPopover } from '../popover/popover';
import {
  KJ_POPOVER,
  type KjPopoverContext,
} from '../popover/popover.context';
import {
  KJ_CONFIRM_POPUP,
  type KjConfirmPopupContext,
  type KjConfirmPopupDefaultFocus,
  nextConfirmPopupMessageId,
} from './confirm-popup.context';

/**
 * Root state container for the confirm popup family.
 *
 * Composes the headless `KjPopover` directive via `hostDirectives` to inherit
 * the entire transport layer: anchor positioning (flip / shift), outside-click
 * dismissal, Escape close, focus restoration, and portal mount. Layers a
 * confirm/cancel resolution contract on top so consumer button slots can
 * resolve the popup with `true` or `false` semantics.
 *
 * Place on whatever element naturally groups the trigger and content (the
 * popover wrapper). The directive is transparent — it sets no host attributes
 * of its own; semantics live on the projected `[kjConfirmPopupContent]` panel
 * (`role="alertdialog"`, `aria-modal="false"`).
 *
 * **Compound shape:**
 *
 * ```html
 * <div kjConfirmPopup [kjDestructive]="true" (kjConfirmed)="onDelete()">
 *   <button kjConfirmPopupTrigger>Delete row</button>
 *   <ng-template kjConfirmPopupContent>
 *     <p kjConfirmPopupMessage>Delete this row?</p>
 *     <button kjConfirmPopupCancel>Cancel</button>
 *     <button kjConfirmPopupAction>Delete</button>
 *   </ng-template>
 * </div>
 * ```
 *
 * The popup defaults to anchor placement above the trigger so the
 * pointer's natural travel doesn't accidentally land on the confirm button —
 * matches the muscle-memory of cancellation flows.
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjConfirmPopup]',
  standalone: true,
  exportAs: 'kjConfirmPopup',
  // Compose the popover directive so consumers only have to place a single
  // attribute on the host. Popover-positioning inputs (`kjPopoverSide`,
  // `kjPopoverAlign`, …) remain accessible via the underlying `[kjPopover]`
  // host directive — consumers bind them on the same element naturally.
  hostDirectives: [KjPopover],
  providers: [
    { provide: KJ_CONFIRM_POPUP, useExisting: KjConfirmPopup },
  ],
})
export class KjConfirmPopup implements KjConfirmPopupContext {
  /** The underlying popover context — sourced via element-injector. */
  private readonly popover = inject<KjPopoverContext>(KJ_POPOVER, { self: true });

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

  /** Open state forwarded from the underlying popover. */
  readonly open = this.popover.open;

  /** Whether the confirm action should render destructively. */
  readonly destructive = this.kjDestructive;

  /** Resolved default focus target. */
  readonly defaultFocus = this.kjDefaultFocus;

  /** Stable id used for the panel's `aria-describedby`. */
  readonly messageId = nextConfirmPopupMessageId();

  /**
   * Tracks whether the current open cycle has been resolved by an explicit
   * confirm / cancel button click. Reset on each open. Distinguishes
   * button-driven closes (already emitted) from implicit closes via Escape /
   * outside-click (which we surface as cancel here).
   */
  private resolved = false;

  /** Last emitted open state — gates the implicit-close cancel emission. */
  private wasOpen = false;

  constructor() {
    // Bridge the popover's open signal into the confirm-popup resolution
    // contract. When the popup closes implicitly (Escape, outside-click,
    // close-button), no explicit resolve has been recorded — emit the
    // cancel side of the contract.
    effect(() => {
      const isOpen = this.popover.open();
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

  // ── Resolution ──────────────────────────────────────────────────────

  /**
   * Close the popup with the given result. `true` confirms, `false` cancels.
   * Bypasses the cancellable popover close cycle — confirm/cancel button
   * clicks always resolve.
   */
  close(result: boolean): void {
    if (!this.popover.open()) return;
    this.resolved = true;
    if (result) this.kjConfirmed.emit();
    else this.kjCancelled.emit();
    this.kjResult.emit(result);
    this.popover.hide('programmatic');
  }
}
