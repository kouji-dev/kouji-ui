import { InjectionToken, Signal } from '@angular/core';
/** What a `[kjFormField]` publishes to its label / error children. */
export interface KjFormFieldContext { invalid: Signal<boolean>; }
/** Provided by `KjFormField`; injected by `KjFormLabel` and `KjFormError`. */
export const KJ_FORM_FIELD = new InjectionToken<KjFormFieldContext>('KjFormField');
