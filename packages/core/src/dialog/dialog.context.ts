import { InjectionToken, Signal } from '@angular/core';

export interface KjDialogContext {
  readonly open: Signal<boolean>;
  readonly dialogId: string;
  readonly closeOnEscape: Signal<boolean>;
  readonly closeOnBackdrop: Signal<boolean>;
  close(result?: unknown): void;
}

export const KJ_DIALOG = new InjectionToken<KjDialogContext>('KjDialog');
