import { Component } from '@angular/core';
import { KjAccordionTrigger } from '@kouji-ui/core';
import {
  KjAccordionComponent, KjAccordionItemComponent,
  KjAccordionTriggerComponent, KjAccordionContentComponent,
} from './accordion';

@Component({
  selector: 'kj-accordion-disabled-example',
  standalone: true,
  imports: [
    KjAccordionTrigger,
    KjAccordionComponent, KjAccordionItemComponent, KjAccordionTriggerComponent, KjAccordionContentComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-accordion>
      <kj-accordion-item value="a">
        <kj-accordion-trigger>Available</kj-accordion-trigger>
        <kj-accordion-content>Open me.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="b">
        <button kjAccordionTrigger type="button" class="kj-accordion-trigger" disabled aria-disabled="true">
          Locked
        </button>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionDisabledExample {}
