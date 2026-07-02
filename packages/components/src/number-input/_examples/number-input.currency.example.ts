import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjNumberInputComponent } from '../number-input';

/**
 * Currency formatting via `Intl.NumberFormat`. The displayed value shows the
 * currency symbol and locale-aware grouping; the stored model stays a clean
 * `number` (e.g. `1234.5`).
 */
@Component({
  selector: 'kj-number-input-currency-example',
  standalone: true,
  imports: [KjNumberInputComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-number-input
      [(kjValue)]="price"
      kjFormat="currency"
      kjCurrency="USD"
      kjLocale="en-US"
      [kjMin]="0"
      [kjStep]="0.01"
      kjAriaLabel="Price"
    />
  `,
})
export class KjNumberInputCurrencyExample {
  readonly price = signal<number>(1234.5);
}
