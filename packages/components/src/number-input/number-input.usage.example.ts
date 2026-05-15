import { Component, signal } from '@angular/core';
import { KjNumberInputComponent } from './number-input';

/**
 * A walkthrough of the most common number-input usages — a plain quantity
 * stepper, a constrained min/max/step picker, and a currency-formatted price
 * field. Use this as the copy-paste starting point for new forms.
 */
@Component({
  selector: 'kj-number-input-usage-example',
  standalone: true,
  imports: [KjNumberInputComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .row { display: flex; gap: var(--kj-space-md); flex-wrap: wrap; align-items: center; }
    label { font-size: 0.875rem; color: var(--kj-fg-default); display: grid; gap: var(--kj-space-xs); }
  `],
  template: `
    <div class="row">
      <label>
        Quantity
        <kj-number-input [(kjValue)]="qty" kjAriaLabel="Quantity" />
      </label>
      <label>
        Servings (1–12)
        <kj-number-input
          [(kjValue)]="servings"
          [kjMin]="1"
          [kjMax]="12"
          [kjStep]="1"
          kjAriaLabel="Servings" />
      </label>
      <label>
        Price
        <kj-number-input
          [(kjValue)]="price"
          kjFormat="currency"
          kjCurrency="USD"
          kjLocale="en-US"
          [kjMinimumFractionDigits]="2"
          [kjMaximumFractionDigits]="2"
          kjAriaLabel="Price" />
      </label>
    </div>
  `,
})
export class KjNumberInputUsageExample {
  readonly qty = signal<number>(3);
  readonly servings = signal<number>(4);
  readonly price = signal<number>(19.99);
}
