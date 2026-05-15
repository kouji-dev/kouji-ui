import { Component, signal } from '@angular/core';
import { KjNumberInputComponent } from './number-input';

/**
 * Demonstrates fractional precision via `kjMinimumFractionDigits` /
 * `kjMaximumFractionDigits` and a decimal step (`0.1`).
 */
@Component({
  selector: 'kj-number-input-decimal-example',
  standalone: true,
  imports: [KjNumberInputComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-number-input
      [(kjValue)]="weight"
      [kjMin]="0"
      [kjMax]="200"
      [kjStep]="0.1"
      [kjMinimumFractionDigits]="1"
      [kjMaximumFractionDigits]="2"
      kjAriaLabel="Weight in kilograms"
    />
  `,
})
export class KjNumberInputDecimalExample {
  readonly weight = signal<number>(72.5);
}
