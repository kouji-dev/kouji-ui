import { Component, signal } from '@angular/core';
import {
  KjStepperComponent,
  KjStepComponent,
  KjStepLabelComponent,
  KjStepContentComponent,
  KjStepperNextComponent,
  KjStepperPreviousComponent,
} from './stepper';

/**
 * Vertical stepper. ArrowUp / ArrowDown roves between headers; the layout
 * stacks columns naturally for narrow viewports.
 */
@Component({
  selector: 'kj-stepper-vertical-example',
  standalone: true,
  imports: [
    KjStepperComponent,
    KjStepComponent,
    KjStepLabelComponent,
    KjStepContentComponent,
    KjStepperNextComponent,
    KjStepperPreviousComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }
      .actions {
        display: flex;
        gap: var(--kj-space-sm);
        margin-top: var(--kj-space-lg);
      }
    `,
  ],
  template: `
    <kj-stepper [(kjActiveStep)]="active" kjOrientation="vertical">
      <kj-step [kjStepCompleted]="active() > 0">
        <kj-step-label>Address</kj-step-label>
        <kj-step-content>Where to ship?</kj-step-content>
      </kj-step>
      <kj-step [kjStepCompleted]="active() > 1">
        <kj-step-label>Shipping</kj-step-label>
        <kj-step-content>Pick a carrier.</kj-step-content>
      </kj-step>
      <kj-step [kjStepCompleted]="active() > 2">
        <kj-step-label>Payment</kj-step-label>
        <kj-step-content>Enter card details.</kj-step-content>
      </kj-step>
      <kj-step>
        <kj-step-label>Review</kj-step-label>
        <kj-step-content>Confirm your order.</kj-step-content>
      </kj-step>
      <div class="actions">
        <kj-stepper-previous>Back</kj-stepper-previous>
        <kj-stepper-next>Next</kj-stepper-next>
      </div>
    </kj-stepper>
  `,
})
export class KjStepperVerticalExample {
  readonly active = signal(0);
}
