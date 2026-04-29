import { Component } from '@angular/core';
import { KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjAccordionDirective, KjAccordionItemDirective, KjAccordionTriggerDirective, KjAccordionContentDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--bg, #0c0c0c); }
    .accordion { border: 1px solid var(--border, #1a1a1a); }
    button[kjAccordionTrigger] { width: 100%; background: none; border: none; border-bottom: 1px solid var(--border, #1a1a1a); color: var(--text, #f0ede6); font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding: 0.875rem 1rem; cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s; }
    button[kjAccordionTrigger]:hover { background: var(--bg-hover, #141414); }
    button[kjAccordionTrigger][aria-expanded="true"] { color: var(--accent, #b8f500); }
    button[kjAccordionTrigger]::after { content: '+'; font-size: 1.1rem; transition: transform 0.2s; }
    button[kjAccordionTrigger][aria-expanded="true"]::after { content: '−'; }
    [kjAccordionContent] { background: var(--bg-subtle, #111); padding: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--text-secondary, #666); line-height: 1.6; border-bottom: 1px solid var(--border, #1a1a1a); }
    [hidden] { display: none !important; }
  `],
  template: `
    <div kjAccordion class="accordion">
      <div kjAccordionItem [kjItemValue]="'faq-1'">
        <button kjAccordionTrigger>What is kouji-ui?</button>
        <div kjAccordionContent>A headless Angular 21 UI library. Zero CSS in the core — bring your own styles.</div>
      </div>
      <div kjAccordionItem [kjItemValue]="'faq-2'">
        <button kjAccordionTrigger>Is it accessible?</button>
        <div kjAccordionContent>Yes — all components target WCAG 2.1 AAA with full keyboard nav and ARIA patterns via CDK.</div>
      </div>
      <div kjAccordionItem [kjItemValue]="'faq-3'">
        <button kjAccordionTrigger>Does it work with Angular forms?</button>
        <div kjAccordionContent>All form controls compose KjFormControlDirective and support formControl, formControlName, and ngModel.</div>
      </div>
    </div>
  `,
})
export class AccordionDemoComponent {}
