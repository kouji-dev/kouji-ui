import { InjectionToken, Signal } from '@angular/core';
export interface KjFormFieldContext { invalid: Signal<boolean>; }
export const KJ_FORM_FIELD = new InjectionToken<KjFormFieldContext>('KjFormField');
