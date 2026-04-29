import { InjectionToken, Signal } from '@angular/core';
export interface KjRadioContext { value: Signal<unknown>; select: (value: unknown) => void; }
export const KJ_RADIO_GROUP = new InjectionToken<KjRadioContext>('KjRadioGroup');
