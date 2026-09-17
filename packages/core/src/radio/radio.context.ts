import { InjectionToken, Signal } from '@angular/core';
/**
 * Contract a radio group publishes to its radios: the group's current value
 * and the callback a radio calls to claim it.
 */
export interface KjRadioContext { value: Signal<unknown>; select: (value: unknown) => void; }

/** Element-injector token every `KjRadio` reads to find its owning group. */
export const KJ_RADIO_GROUP = new InjectionToken<KjRadioContext>('KjRadioGroup');
