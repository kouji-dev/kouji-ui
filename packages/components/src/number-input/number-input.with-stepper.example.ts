import { Component, signal } from '@angular/core';
import { KjNumberInputComponent } from './number-input';

/**
 * Demonstrates the canonical stepper layout. The wrapper renders the +/-
 * buttons internally; consumers only set bounds + step.
 */
@Component({
  selector: 'kj-number-input-with-stepper-example',
  standalone: true,
  imports: [KjNumberInputComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; }
    label { font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-default); }
  `],
  template: `
    <div class="row">
      <label for="number-input-servings">Servings</label>
      <kj-number-input
        id="number-input-servings"
        [(kjValue)]="servings"
        [kjMin]="1"
        [kjMax]="20"
        [kjStep]="1"
        kjAriaLabel="Servings"
      />
    </div>
  `,
})
export class KjNumberInputWithStepperExample {
  readonly servings = signal<number>(4);
}
