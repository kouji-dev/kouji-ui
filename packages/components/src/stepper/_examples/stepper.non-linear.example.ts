import { Component, signal } from '@angular/core';
import {
  KjStepperComponent,
  KjStepComponent,
  KjStepLabelComponent,
  KjStepContentComponent,
  KjStepperNextComponent,
  KjStepperPreviousComponent,
} from '../stepper';

/**
 * Non-linear stepper. Every header is reachable at any time — useful for
 * settings panels and long-form editors where the steps don't depend on
 * each other.
 */
@Component({
  selector: 'kj-stepper-non-linear-example',
  standalone: true,
  imports: [
    KjStepperComponent,
    KjStepComponent,
    KjStepLabelComponent,
    KjStepContentComponent,
    KjStepperNextComponent,
    KjStepperPreviousComponent,
  ],
  styles: [`
    :host { display: block; }
    .actions { display: flex; gap: var(--kj-space-sm); margin-top: var(--kj-space-lg); }
  `],
  template: `
    <kj-stepper [(kjActiveStep)]="active">
      <kj-step>
        <kj-step-label>Profile</kj-step-label>
        <kj-step-content>Edit your profile.</kj-step-content>
      </kj-step>
      <kj-step>
        <kj-step-label>Notifications</kj-step-label>
        <kj-step-content>Tune your alerts.</kj-step-content>
      </kj-step>
      <kj-step>
        <kj-step-label>Billing</kj-step-label>
        <kj-step-content>Update payment.</kj-step-content>
      </kj-step>
      <div class="actions">
        <kj-stepper-previous>Back</kj-stepper-previous>
        <kj-stepper-next>Next</kj-stepper-next>
      </div>
    </kj-stepper>
  `,
})
export class KjStepperNonLinearExample {
  readonly active = signal(0);
}
