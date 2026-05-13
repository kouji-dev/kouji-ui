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
 * Stepper with a step in error state. The middle step's `kjStepError` flag
 * paints the error indicator on its header — re-entry is still permitted so
 * the user can return and fix the issue.
 */
@Component({
  selector: 'kj-stepper-with-error-example',
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
      <kj-step [kjStepCompleted]="true">
        <kj-step-label>Diagnostic</kj-step-label>
        <kj-step-content>System checks passed.</kj-step-content>
      </kj-step>
      <kj-step [kjStepError]="true">
        <kj-step-label>Severity</kj-step-label>
        <kj-step-content>Validation failed — please review the inputs.</kj-step-content>
      </kj-step>
      <kj-step>
        <kj-step-label>Triage</kj-step-label>
        <kj-step-content>Assign an owner.</kj-step-content>
      </kj-step>
      <div class="actions">
        <kj-stepper-previous>Back</kj-stepper-previous>
        <kj-stepper-next>Next</kj-stepper-next>
      </div>
    </kj-stepper>
  `,
})
export class KjStepperWithErrorExample {
  readonly active = signal(1);
}
