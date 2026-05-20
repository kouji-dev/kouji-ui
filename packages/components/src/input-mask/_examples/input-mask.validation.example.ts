import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjInputMask } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldErrorComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from '../../field/field';

/**
 * Reactive form with `Validators.required` and the built-in `mask` validator.
 *
 * The mask validator fires automatically when the field has been partially
 * filled — no extra wiring needed. Read `ctrl.errors?.mask` in your template
 * to show a custom "incomplete" message.
 */
@Component({
  selector: 'kj-input-mask-validation-example',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    KjInputMask,
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjFieldErrorComponent,
  ],
  styles: [`
    :host {
      display: block; max-width: 400px;
    }
    input[kjInputMask] { color: var(--kj-fg-default);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field, 0.375rem);
      padding: var(--kj-space-sm) var(--kj-space-md);
      font: var(--kj-text-sm) / 1.4 var(--kj-font-sans);
      font-variant-numeric: tabular-nums;
      width: 100%;
    }
    input[kjInputMask]:focus-visible {
      outline: 2px solid var(--kj-fg-primary);
      outline-offset: 2px;
      border-color: var(--kj-fg-primary);
    }
    input[kjInputMask][aria-invalid='true'] {
      border-color: var(--kj-fg-danger, #ef4444);
    }
  `],
  template: `
    <kj-field [kjInvalid]="phoneCtrl.invalid && phoneCtrl.touched">
      <kj-field-label>Phone number</kj-field-label>
      <input
        kjInputMask
        kjMask="(999) 999-9999"
        [formControl]="phoneCtrl"
        [kjInvalid]="phoneCtrl.invalid && phoneCtrl.touched"
      />
      <kj-field-help>US phone, e.g. (415) 555-0123</kj-field-help>
      @if (phoneCtrl.touched && phoneCtrl.errors?.['required']) {
        <kj-field-error>Phone number is required.</kj-field-error>
      } @else if (phoneCtrl.touched && phoneCtrl.errors?.['mask']) {
        <kj-field-error>
          Please enter all {{ $any(phoneCtrl.errors)['mask']?.required }} digits
          ({{ $any(phoneCtrl.errors)['mask']?.filled }} of
          {{ $any(phoneCtrl.errors)['mask']?.required }} filled).
        </kj-field-error>
      }
    </kj-field>
  `,
})
export class KjInputMaskValidationExample {
  readonly phoneCtrl = new FormControl('', [Validators.required]);
}
