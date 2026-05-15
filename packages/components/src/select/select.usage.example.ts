import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from './select';

/**
 * A walkthrough of the most common select usages — a single-value picker
 * with a placeholder, a pre-selected value, and a disabled control. Use this
 * as the copy-paste starting point for forms.
 */
@Component({
  selector: 'kj-select-usage-example',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); max-width: 18rem; }
    label { display: grid; gap: var(--kj-space-xs); font-size: 0.875rem; color: var(--kj-fg-default); }
  `],
  template: `
    <label>
      Fruit (placeholder)
      <kj-select [(value)]="fruit" placeholder="Choose a fruit">
        <kj-option [value]="'apple'">Apple</kj-option>
        <kj-option [value]="'banana'">Banana</kj-option>
        <kj-option [value]="'cherry'">Cherry</kj-option>
      </kj-select>
    </label>

    <label>
      Country (pre-selected)
      <kj-select [(value)]="country">
        <kj-option [value]="'us'">United States</kj-option>
        <kj-option [value]="'jp'">Japan</kj-option>
        <kj-option [value]="'fr'">France</kj-option>
      </kj-select>
    </label>

    <label>
      Locked
      <kj-select [(value)]="locked" [disabled]="true" placeholder="Read-only">
        <kj-option [value]="'a'">Option A</kj-option>
      </kj-select>
    </label>
  `,
})
export class KjSelectUsageExample {
  readonly fruit = signal<string | undefined>(undefined);
  readonly country = signal<string>('jp');
  readonly locked = signal<string | undefined>(undefined);
}
