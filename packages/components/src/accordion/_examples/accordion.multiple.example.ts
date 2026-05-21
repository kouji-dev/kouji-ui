import { Component } from '@angular/core';
import {
  KjAccordionComponent, KjAccordionItemComponent, KjAccordionContentComponent,
} from '../accordion';

@Component({
  selector: 'kj-accordion-multiple-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionContentComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-accordion type="multiple">
      <kj-accordion-item value="a" label="Section A">
        <kj-accordion-content>Both can be open at once.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="b" label="Section B">
        <kj-accordion-content>Click to confirm.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionMultipleExample {}
