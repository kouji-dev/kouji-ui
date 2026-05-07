import { InjectionToken, type Signal } from '@angular/core';

/**
 * Where initial focus lands when the confirm popup opens.
 *
 * - `'cancel'` — the safer default per WCAG 3.3.4 *Error Prevention*.
 * - `'confirm'` — opt-in for non-destructive flows where the muscle-memory
 *   should snap to "Yes".
 */
export type KjConfirmPopupDefaultFocus = 'confirm' | 'cancel';

/**
 * Context shared between the confirm popup directives. Lives in parallel with
 * the underlying `KJ_POPOVER` context — `KjConfirmPopup` reads from popover
 * for open/close mechanics but exposes its own context to children for the
 * confirm/cancel resolution contract.
 */
export interface KjConfirmPopupContext {
  /** Whether the popup is currently open. Mirrors the popover's `open` signal. */
  readonly open: Signal<boolean>;
  /** Whether the confirm action should render with destructive intent. */
  readonly destructive: Signal<boolean>;
  /** Where initial focus lands on open. */
  readonly defaultFocus: Signal<KjConfirmPopupDefaultFocus>;
  /** Stable id used for `aria-describedby` wiring on the panel. */
  readonly messageId: string;

  /** Resolve the confirmation: `true` confirms, `false` cancels. */
  close(result: boolean): void;
}

/** Injection token for the confirm popup context. */
export const KJ_CONFIRM_POPUP = new InjectionToken<KjConfirmPopupContext>(
  'KjConfirmPopup',
);

let _confirmPopupMessageIdCounter = 0;
/** Allocate a stable id used for `aria-describedby` wiring. */
export function nextConfirmPopupMessageId(): string {
  return `kj-confirm-popup-message-${++_confirmPopupMessageIdCounter}`;
}
