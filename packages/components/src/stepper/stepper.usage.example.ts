import { Component, signal } from '@angular/core';
import {
  KjStepperComponent,
  KjStepComponent,
  KjStepLabelComponent,
  KjStepContentComponent,
  KjStepperNextComponent,
  KjStepperPreviousComponent,
  KjStepperResetComponent,
} from './stepper';

/**
 * A walkthrough of the most common stepper usages — linear progression with
 * completion gating, Next / Previous / Reset commands, and live readout of the
 * active step index. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-stepper-usage-example',
  standalone: true,
  imports: [
    KjStepperComponent,
    KjStepComponent,
    KjStepLabelComponent,
    KjStepContentComponent,
    KjStepperNextComponent,
    KjStepperPreviousComponent,
    KjStepperResetComponent,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .actions { display: flex; gap: var(--kj-space-sm); margin-top: var(--kj-space-md); }
    .readout { font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-muted); }
  `],
  template: `
    <p class="readout">Active step: {{ active() + 1 }} of 3</p>
    <kj-stepper [(kjActiveStep)]="active" [kjLinear]="true">
      <kj-step [kjStepCompleted]="active() > 0">
        <kj-step-label>Account</kj-step-label>
        <kj-step-content>Pick an email and password.</kj-step-content>
      </kj-step>
      <kj-step [kjStepCompleted]="active() > 1">
        <kj-step-label>Profile</kj-step-label>
        <kj-step-content>Add your display name.</kj-step-content>
      </kj-step>
      <kj-step>
        <kj-step-label>Confirm</kj-step-label>
        <kj-step-content>Review and submit.</kj-step-content>
      </kj-step>
      <div class="actions">
        <kj-stepper-previous>Back</kj-stepper-previous>
        <kj-stepper-next>Continue</kj-stepper-next>
        <kj-stepper-reset>Reset</kj-stepper-reset>
      </div>
    </kj-stepper>
  `,
})
export class KjStepperUsageExample {
  readonly active = signal(0);
}
