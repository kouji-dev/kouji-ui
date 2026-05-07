import { InjectionToken, type Signal } from '@angular/core';
import type { KjDialogContext } from '../dialog/dialog.context';

/**
 * Context shared between the alert-dialog directive family.
 *
 * Extends {@link KjDialogContext} with extra state specific to the
 * alert-dialog pattern:
 *
 * - `destructive` — drives the visual treatment of the confirm/action button.
 * - `defaultFocus` — `'cancel' | 'confirm'`. Resolved by `[kjAlertDialog]`
 *   when running its initial-focus pass.
 *
 * Implemented by `KjAlertDialogTrigger` on the declarative path. We
 * deliberately do NOT reuse `KJ_DIALOG`: alert-dialog children should fail
 * to compile if injected into a plain dialog scope, and vice versa.
 */
export interface KjAlertDialogContext extends KjDialogContext {
  readonly destructive: Signal<boolean>;
  readonly defaultFocus: Signal<'confirm' | 'cancel'>;

  /** @internal Register the cancel button element for default-focus resolution. */
  registerCancelEl(el: HTMLElement | null): void;
  /** @internal Register the confirm button element for default-focus resolution. */
  registerConfirmEl(el: HTMLElement | null): void;
}

/** Injection token for the alert-dialog context. */
export const KJ_ALERT_DIALOG = new InjectionToken<KjAlertDialogContext>('KjAlertDialog');
