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
 * Linear stepper with an optional middle step. `kjStepOptional` lifts the
 * `linear`-mode advancement gate so the user may skip without satisfying it.
 */
@Component({
  selector: 'kj-stepper-optional-step-example',
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
    <kj-stepper [(kjActiveStep)]="active" [kjLinear]="true">
      <kj-step [kjStepCompleted]="active() > 0">
        <kj-step-label>Account</kj-step-label>
        <kj-step-content>Required.</kj-step-content>
      </kj-step>
      <kj-step [kjStepOptional]="true">
        <kj-step-label>Avatar (optional)</kj-step-label>
        <kj-step-content>Skip if you'd rather upload later.</kj-step-content>
      </kj-step>
      <kj-step>
        <kj-step-label>Confirm</kj-step-label>
        <kj-step-content>Review and submit.</kj-step-content>
      </kj-step>
      <div class="actions">
        <kj-stepper-previous>Back</kj-stepper-previous>
        <kj-stepper-next>Continue</kj-stepper-next>
      </div>
    </kj-stepper>
  `,
})
export class KjStepperOptionalStepExample {
  readonly active = signal(0);
}
