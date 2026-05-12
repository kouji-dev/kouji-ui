import { Component, signal } from '@angular/core';
import { KjNumberInputComponent } from './number-input';

/**
 * Default usage example for KjNumberInputComponent.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-number-input-example',
  standalone: true,
  imports: [KjNumberInputComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: ` <kj-number-input [(kjValue)]="qty" kjAriaLabel="Quantity" /> `,
})
export class KjNumberInputExample {
  readonly qty = signal<number>(3);
}
