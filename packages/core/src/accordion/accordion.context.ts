import { InjectionToken, Signal } from '@angular/core';

/** Context interface for the root accordion directive. */
export interface KjAccordionContext {
  readonly openIds: Signal<ReadonlySet<string>>;
  toggle(id: string): void;
  isOpen(id: string): boolean;
}

/** Context interface for an individual accordion item directive. */
export interface KjAccordionItemContext {
  readonly expanded: Signal<boolean>;
  toggle(): void;
  open(): void;
  close(): void;
}

/** Injection token for the root accordion directive. */
export const KJ_ACCORDION = new InjectionToken<KjAccordionContext>('KjAccordion');

/** Injection token for an individual accordion item directive. */
export const KJ_ACCORDION_ITEM = new InjectionToken<KjAccordionItemContext>('KjAccordionItem');
