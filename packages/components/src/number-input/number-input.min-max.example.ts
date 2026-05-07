import { Component, signal } from '@angular/core';
import { KjNumberInputComponent } from './number-input';

/**
 * Demonstrates clamp-on-commit + snap-to-step. Bounds are 0..100 with step 5;
 * values typed off the lattice snap on the next stepper press, and PageUp /
 * PageDown jump by 50.
 */
@Component({
  selector: 'kj-number-input-min-max-example',
  standalone: true,
  imports: [KjNumberInputComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-number-input
      [(kjValue)]="percentage"
      [kjMin]="0"
      [kjMax]="100"
      [kjStep]="5"
      kjAriaLabel="Percentage"
    />
  `,
})
export class KjNumberInputMinMaxExample {
  readonly percentage = signal<number>(50);
}
