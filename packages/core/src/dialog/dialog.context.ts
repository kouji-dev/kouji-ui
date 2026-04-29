import { InjectionToken, Signal, TemplateRef, ViewContainerRef } from '@angular/core';

/** Context shared between dialog directives. */
export interface KjDialogContext {
  open: Signal<boolean>;
  show: () => void;
  hide: () => void;
  registerTemplate: (tpl: TemplateRef<unknown>, vcr: ViewContainerRef) => void;
}

/** Injection token for dialog context. */
export const KJ_DIALOG = new InjectionToken<KjDialogContext>('KjDialog');
