import { InjectionToken } from '@angular/core';
import { CdkAccordion, CdkAccordionItem } from '@angular/cdk/accordion';

/** Injection token for the root accordion directive. */
export const KJ_ACCORDION = new InjectionToken<CdkAccordion>('KjAccordion');

/** Injection token for an individual accordion item directive. */
export const KJ_ACCORDION_ITEM = new InjectionToken<CdkAccordionItem>('KjAccordionItem');
