import { InjectionToken, Signal } from '@angular/core';

/** Shared context passed from KjTabs to child tab/panel directives. */
export interface KjTabsContext {
  value: Signal<string>;
  activate: (value: string) => void;
}

export const KJ_TABS = new InjectionToken<KjTabsContext>('KjTabs');
