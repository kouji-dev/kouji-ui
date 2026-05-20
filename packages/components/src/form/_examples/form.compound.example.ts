import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../../button/button';
import { KjFieldComponent, KjFieldLabelComponent } from '../../field/field';
import { KjInputComponent } from '../../input/input';
import {
  KjFormActionsComponent,
  KjFormComponent,
  KjFormSummaryComponent,
} from '../form';

/**
 * Compound form — multiple `FormGroup` sections (account + address) inside a
 * single `<form kj-form>`. Demonstrates that the focus-on-first-error
 * tree-walk descends into nested groups and the error summary lists nested
 * fields by their dotted path.
 */
@Component({
  selector: 'kj-form-compound-example',
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
    :host { display: block; }
    .group { display: flex; flex-direction: column; gap: 0.5rem; padding: var(--kj-space-md); border: 1px solid var(--kj-border-default); border-radius: 0.5rem; }
    .group h3 { margin: 0; font-size: 0.875rem; }
  `],
  template: `
    <form kj-form [formGroup]="form" (kjSubmit)="lastValue.set($event)">
      <kj-form-summary />

      <fieldset class="group" formGroupName="account">
        <h3>Account</h3>
        <kj-field>
          <kj-field-label>Username</kj-field-label>
          <kj-input type="text" formControlName="username" />
        </kj-field>
        <kj-field>
          <kj-field-label>Email</kj-field-label>
          <kj-input type="email" formControlName="email" />
        </kj-field>
      </fieldset>

      <fieldset class="group" formGroupName="address">
        <h3>Address</h3>
        <kj-field>
          <kj-field-label>Street</kj-field-label>
          <kj-input type="text" formControlName="street" />
        </kj-field>
        <kj-field>
          <kj-field-label>City</kj-field-label>
          <kj-input type="text" formControlName="city" />
        </kj-field>
      </fieldset>

      <kj-form-actions>
        <kj-button kjType="submit">Create account</kj-button>
      </kj-form-actions>
    </form>
  `,
})
export class KjFormCompoundExample {
  readonly form = new FormGroup({
    account: new FormGroup({
      username: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
    }),
    address: new FormGroup({
      street: new FormControl('', [Validators.required]),
      city: new FormControl('', [Validators.required]),
    }),
  });
  readonly lastValue = signal<unknown>(null);
}
