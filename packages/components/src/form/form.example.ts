import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../button/button';
import { KjFieldComponent, KjFieldLabelComponent } from '../field/field';
import { KjInputComponent } from '../input/input';
import { KjFormActionsComponent, KjFormComponent } from './form';

/**
 * Default `<form kj-form>` usage — a small login form with email + password.
 * Demonstrates `(kjSubmit)` (only fires when valid), the auto submit-button
 * coordination, and the focus-on-first-error behaviour out of the box.
 */
@Component({
  selector: 'kj-form-example',
  standalone: true,
  imports: [
    KjFormComponent,
    KjFormActionsComponent,
    KjFieldComponent,
    KjFieldLabelComponent,
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
    JsonPipe,
  ],
  styles: [
    `
      :host {
        display: block;
      }
      .submitted {
        font-size: 0.8125rem;
        opacity: 0.7;
        margin-top: 0.5rem;
      }
    `,
  ],
  template: `
    <form kj-form [formGroup]="form" (kjSubmit)="onSubmit($event)">
      <kj-field>
        <kj-field-label>Email</kj-field-label>
        <kj-input type="email" formControlName="email" placeholder="you@example.com" />
      </kj-field>
      <kj-field>
        <kj-field-label>Password</kj-field-label>
        <kj-input type="password" formControlName="password" />
      </kj-field>
      <kj-form-actions>
        <kj-button kjType="submit">Sign in</kj-button>
      </kj-form-actions>
    </form>

    @if (lastValue()) {
      <p class="submitted">Submitted: {{ lastValue() | json }}</p>
    }
  `,
})
export class KjFormExample {
  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });
  readonly lastValue = signal<unknown>(null);

  onSubmit(value: unknown): void {
    this.lastValue.set(value);
  }
}
