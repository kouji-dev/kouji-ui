import { Component } from '@angular/core';
import {
  KjAccordionComponent, KjAccordionItemComponent,
  KjAccordionTriggerComponent, KjAccordionContentComponent,
} from '../accordion';

@Component({
  selector: 'kj-accordion-disabled-example',
  standalone: true,
  imports: [
    KjAccordionComponent, KjAccordionItemComponent, KjAccordionTriggerComponent, KjAccordionContentComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-accordion>
      <kj-accordion-item value="a">
        <kj-accordion-trigger>Available</kj-accordion-trigger>
        <kj-accordion-content>Open me.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="b">
        <kj-accordion-trigger [disabled]="true">Locked</kj-accordion-trigger>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionDisabledExample {}
