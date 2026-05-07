import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import {
  KjFormActionsComponent,
  KjFormComponent,
  KjFormSummaryComponent,
} from './form';

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
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    .group { display: flex; flex-direction: column; gap: 0.5rem; padding: var(--kj-space-md); border: 1px solid var(--kj-color-base-300); border-radius: 0.5rem; }
    .group h3 { margin: 0; font-size: 0.875rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-size: 0.8125rem; color: var(--kj-color-base-content); }
  `],
  template: `
    <form kj-form [formGroup]="form" (kjSubmit)="lastValue.set($event)">
      <kj-form-summary />

      <fieldset class="group" formGroupName="account">
        <h3>Account</h3>
        <div class="field">
          <label for="username">Username</label>
          <kj-input type="text" formControlName="username" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <kj-input type="email" formControlName="email" />
        </div>
      </fieldset>

      <fieldset class="group" formGroupName="address">
        <h3>Address</h3>
        <div class="field">
          <label for="street">Street</label>
          <kj-input type="text" formControlName="street" />
        </div>
        <div class="field">
          <label for="city">City</label>
          <kj-input type="text" formControlName="city" />
        </div>
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
