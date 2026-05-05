import { Component } from '@angular/core';
import {
  KjAccordionComponent, KjAccordionItemComponent,
  KjAccordionTriggerComponent, KjAccordionContentComponent,
} from './accordion';

@Component({
  selector: 'kj-accordion-default-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionTriggerComponent, KjAccordionContentComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-accordion>
      <kj-accordion-item value="one">
        <kj-accordion-trigger>What is kouji-ui?</kj-accordion-trigger>
        <kj-accordion-content>A headless-first component library for Angular.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="two">
        <kj-accordion-trigger>Is it free?</kj-accordion-trigger>
        <kj-accordion-content>Yes — MIT licensed.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionDefaultExample {}
