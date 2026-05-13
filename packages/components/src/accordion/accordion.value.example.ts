import { Component, signal } from '@angular/core';
import {
  KjAccordionComponent,
  KjAccordionItemComponent,
  KjAccordionContentComponent,
} from './accordion';

/**
 * Two-way bound `value` driving an external signal. Click the buttons above
 * the accordion to open or close items programmatically — the signal and the
 * component stay in sync because `[(value)]` round-trips through `kjValue`.
 */
@Component({
  selector: 'kj-accordion-value-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionContentComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .controls { display: flex; gap: var(--kj-space-sm); margin-bottom: var(--kj-space-md); }
    button { padding: 0.25rem 0.75rem; border: 1px solid var(--kj-border-default); background: var(--kj-bg-body); border-radius: var(--kj-radius-field); cursor: pointer; }
  `],
  template: `
    <div class="controls">
      <button type="button" (click)="open.set('overview')">Open overview</button>
      <button type="button" (click)="open.set('billing')">Open billing</button>
      <button type="button" (click)="open.set('')">Close all</button>
      <span style="margin-left:auto; font: 0.875rem var(--kj-font-mono);">value = "{{ open() }}"</span>
    </div>
    <kj-accordion [(value)]="open">
      <kj-accordion-item value="overview" label="Overview">
        <kj-accordion-content>Account snapshot, recent activity.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="billing" label="Billing">
        <kj-accordion-content>Invoices and payment methods.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="security" label="Security">
        <kj-accordion-content>Sessions, MFA, recovery codes.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionValueExample {
  readonly open = signal<string>('overview');
}
