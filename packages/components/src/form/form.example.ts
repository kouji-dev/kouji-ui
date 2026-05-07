import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import {
  KjFormActionsComponent,
  KjFormComponent,
} from './form';

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
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
    JsonPipe,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-size: 0.8125rem; color: var(--kj-color-base-content); }
    .submitted { font-size: 0.8125rem; opacity: 0.7; margin-top: 0.5rem; }
  `],
  template: `
    <form kj-form [formGroup]="form" (kjSubmit)="onSubmit($event)">
      <div class="field">
        <label for="email">Email</label>
        <kj-input type="email" formControlName="email" placeholder="you@example.com" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <kj-input type="password" formControlName="password" />
      </div>
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
