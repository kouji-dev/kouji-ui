import { Component } from '@angular/core';
import {
  KjAccordionComponent, KjAccordionItemComponent, KjAccordionContentComponent,
} from './accordion';

@Component({
  selector: 'kj-accordion-default-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionContentComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-accordion>
      <kj-accordion-item value="one" label="What is kouji-ui?">
        <kj-accordion-content>A headless-first component library for Angular.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="two" label="Is it free?">
        <kj-accordion-content>Yes — MIT licensed.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionDefaultExample {}
