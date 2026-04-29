import { InjectionToken, Signal } from '@angular/core';
export interface KjDialogContext { open: Signal<boolean>; show: () => void; hide: () => void; }
export const KJ_DIALOG = new InjectionToken<KjDialogContext>('KjDialog');
