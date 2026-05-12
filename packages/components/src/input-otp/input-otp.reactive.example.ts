import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

/**
 * Reactive form with `Validators.required` and `Validators.minLength(6)`.
 * Demonstrates the touched-gated invalid state with an error message.
 */
@Component({
  selector: 'kj-input-otp-reactive-example',
  standalone: true,
  imports: [KjInputOtpComponent, ReactiveFormsModule],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--kj-space-lg);
      }
      label {
        font-size: var(--kj-text-sm);
        color: var(--kj-color-base-content);
      }
      .error {
        font-size: var(--kj-text-xs);
        color: var(--kj-color-destructive);
        font-family: var(--kj-font-mono);
        min-height: 1.25rem;
      }
    `,
  ],
  template: `
    <label for="input-otp-reactive">Enter your 6-digit code</label>
    <kj-input-otp
      id="input-otp-reactive"
      [kjLength]="6"
      kjAriaLabel="6-digit verification code"
      [kjInvalid]="ctrl.invalid && ctrl.touched"
      [formControl]="ctrl"
    />
    @if (ctrl.invalid && ctrl.touched) {
      <span class="error" role="alert">
        @if (ctrl.hasError('required')) {
          Code is required.
        } @else if (ctrl.hasError('minlength')) {
          Please enter all 6 digits.
        }
      </span>
    } @else {
      <span class="error"></span>
    }
  `,
})
export class KjInputOtpReactiveExample {
  readonly ctrl = new FormControl('', [Validators.required, Validators.minLength(6)]);
}
