import { InjectionToken, Signal } from '@angular/core';
export interface KjAccordionContext { openItems: Signal<Set<string>>; toggle: (value: string) => void; }
export const KJ_ACCORDION = new InjectionToken<KjAccordionContext>('KjAccordion');
export interface KjAccordionItemContext { open: Signal<boolean>; itemValue: Signal<string>; }
export const KJ_ACCORDION_ITEM = new InjectionToken<KjAccordionItemContext>('KjAccordionItem');
