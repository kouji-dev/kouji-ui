import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../button/button';
import { KjFieldComponent, KjFieldLabelComponent } from '../field/field';
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
    KjFieldComponent,
    KjFieldLabelComponent,
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
  `],
  template: `
    <form kj-form [formGroup]="form" (kjSubmit)="onSubmit()">
      <kj-form-summary />

      <kj-field>
        <kj-field-label>Full name</kj-field-label>
        <kj-input type="text" formControlName="name" />
      </kj-field>
      <kj-field>
        <kj-field-label>Email</kj-field-label>
        <kj-input type="email" formControlName="email" />
      </kj-field>
      <kj-field>
        <kj-field-label>Phone</kj-field-label>
        <kj-input type="tel" formControlName="phone" />
      </kj-field>

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
