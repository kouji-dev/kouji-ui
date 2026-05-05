import { Component } from '@angular/core';
import {
  KjAccordionComponent, KjAccordionItemComponent,
  KjAccordionTriggerComponent, KjAccordionContentComponent,
} from './accordion';

@Component({
  selector: 'kj-accordion-rich-content-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionTriggerComponent, KjAccordionContentComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-accordion type="multiple">
      <kj-accordion-item value="features">
        <kj-accordion-trigger>Features</kj-accordion-trigger>
        <kj-accordion-content>
          <ul style="margin:0; padding-left:1.25rem;">
            <li>Headless directives</li>
            <li>Signal inputs</li>
            <li>WCAG 2.1 AAA target</li>
          </ul>
        </kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="snippet">
        <kj-accordion-trigger>Code sample</kj-accordion-trigger>
        <kj-accordion-content>
          <pre style="margin:0; font: 0.8125rem var(--kj-font-mono);">npm i @kouji-ui/components</pre>
        </kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionRichContentExample {}
