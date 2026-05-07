import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import {
  KjFormActionsComponent,
  KjFormComponent,
  KjFormSummaryComponent,
} from './form';

/**
 * Validation example — submitting an empty form populates the
 * `<kj-form-summary>` companion with the list of invalid fields, focuses the
 * first invalid input, and announces the count politely-but-assertively.
 */
@Component({
  selector: 'kj-form-validation-example',
  standalone: true,
  imports: [
    KjFormComponent,
    KjFormActionsComponent,
    KjFormSummaryComponent,
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-size: 0.8125rem; color: var(--kj-color-base-content); }
  `],
  template: `
    <form kj-form [formGroup]="form" (kjSubmit)="onSubmit()">
      <kj-form-summary />

      <div class="field">
        <label for="name">Full name</label>
        <kj-input type="text" formControlName="name" />
      </div>
      <div class="field">
        <label for="email">Email</label>
        <kj-input type="email" formControlName="email" />
      </div>
      <div class="field">
        <label for="phone">Phone</label>
        <kj-input type="tel" formControlName="phone" />
      </div>

      <kj-form-actions>
        <kj-button kjType="submit">Continue</kj-button>
      </kj-form-actions>
    </form>
  `,
})
export class KjFormValidationExample {
  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required]),
  });

  onSubmit(): void {
    /* no-op for the doc example */
  }
}
