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
 * Default 3-step linear stepper. Demonstrates the canonical Account → Profile →
 * Confirm flow with `kjLinear` advancement gated by per-step completion.
 */
@Component({
  selector: 'kj-stepper-example',
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
    <kj-stepper [(kjActiveStep)]="active" [kjLinear]="true">
      <kj-step [kjStepCompleted]="active() > 0">
        <kj-step-label>Account</kj-step-label>
        <kj-step-content>Create your account.</kj-step-content>
      </kj-step>
      <kj-step [kjStepCompleted]="active() > 1">
        <kj-step-label>Profile</kj-step-label>
        <kj-step-content>Tell us about yourself.</kj-step-content>
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
export class KjStepperExample {
  readonly active = signal(0);
}
