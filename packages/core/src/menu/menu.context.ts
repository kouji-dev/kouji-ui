import { InjectionToken, Signal } from '@angular/core';

/** Context shared between menu directives. */
export interface KjMenuContext {
  readonly open: Signal<boolean>;
  toggle(): void;
  close(): void;
}

export const KJ_MENU = new InjectionToken<KjMenuContext>('KjMenu');
