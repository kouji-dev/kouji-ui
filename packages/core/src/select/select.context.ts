import { InjectionToken, Signal } from '@angular/core';
export interface KjSelectContext { value: Signal<unknown>; open: Signal<boolean>; select: (value: unknown) => void; toggle: () => void; hide: () => void; }
export const KJ_SELECT = new InjectionToken<KjSelectContext>('KjSelect');
