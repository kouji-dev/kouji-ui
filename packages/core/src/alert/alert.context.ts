import { InjectionToken, Signal } from '@angular/core';

/**
 * Resolved alert mode after applying the matrix. See `alert.md` for the
 * full role/aria-live mapping.
 */
export type KjAlertMode = 'assertive' | 'polite' | 'static' | 'off';

/**
 * Context exposed by `KjAlert` to its descendant directives via the
 * `KJ_ALERT` injection token. Title/description register their generated
 * ids so the root can reflect `aria-labelledby` / `aria-describedby`.
 */
export interface KjAlertContext {
  readonly alertId: Signal<string>;
  readonly variant: Signal<string>;
  readonly mode: Signal<KjAlertMode>;
  readonly titleId: Signal<string | null>;
  readonly descriptionId: Signal<string | null>;
  registerTitle(id: string): void;
  unregisterTitle(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;
  dismiss(): void;
}

/** DI token for the alert context — provided by `KjAlert`. */
export const KJ_ALERT = new InjectionToken<KjAlertContext>('KjAlert');
