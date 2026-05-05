import { Component } from '@angular/core';
import {
  KjAccordionComponent, KjAccordionItemComponent,
  KjAccordionTriggerComponent, KjAccordionContentComponent,
} from './accordion';

@Component({
  selector: 'kj-accordion-multiple-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionTriggerComponent, KjAccordionContentComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-accordion type="multiple">
      <kj-accordion-item value="a">
        <kj-accordion-trigger>Section A</kj-accordion-trigger>
        <kj-accordion-content>Both can be open at once.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="b">
        <kj-accordion-trigger>Section B</kj-accordion-trigger>
        <kj-accordion-content>Click to confirm.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionMultipleExample {}
