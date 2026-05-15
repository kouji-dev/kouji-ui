import { Component, signal } from '@angular/core';
import { KjRadioGroupComponent, KjRadioComponent } from './radio';

/**
 * A walkthrough of the most common radio usages — vertical and horizontal
 * groups, a disabled option, and a bound selection. Use this as the
 * copy-paste starting point for form choices.
 */
@Component({
  selector: 'kj-radio-usage-example',
  standalone: true,
  imports: [KjRadioGroupComponent, KjRadioComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-xl); }
    .label { font-size: 0.75rem; color: var(--kj-fg-default); opacity: 0.7; text-transform: uppercase; letter-spacing: 0.04em; }
  `],
  template: `
    <div>
      <span class="label">Size (vertical)</span>
      <kj-radio-group [(value)]="size" ariaLabel="Size">
        <kj-radio [value]="'s'">Small</kj-radio>
        <kj-radio [value]="'m'">Medium</kj-radio>
        <kj-radio [value]="'l'">Large</kj-radio>
        <kj-radio [value]="'xl'" [disabled]="true">X-Large (out of stock)</kj-radio>
      </kj-radio-group>
    </div>

    <div>
      <span class="label">Plan (horizontal)</span>
      <kj-radio-group [(value)]="plan" orientation="horizontal" ariaLabel="Plan">
        <kj-radio [value]="'free'">Free</kj-radio>
        <kj-radio [value]="'pro'">Pro</kj-radio>
        <kj-radio [value]="'team'">Team</kj-radio>
      </kj-radio-group>
    </div>
  `,
})
export class KjRadioUsageExample {
  readonly size = signal<'s' | 'm' | 'l' | 'xl'>('m');
  readonly plan = signal<'free' | 'pro' | 'team'>('pro');
}
