import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjFieldControl } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldErrorComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from '../field';

/**
 * `kj-field` showing an error message. The error registers its id with the
 * field; when `kjInvalid` is true the field swaps the help-id for the
 * error-id in the inner input's `aria-describedby`, sets `aria-invalid` on
 * it, and toggles the help / error visibility.
 */
@Component({
  selector: 'kj-field-with-error-example',
  standalone: true,
  imports: [
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjFieldErrorComponent,
    KjFieldControl,
  ],
  styles: [
    `
      :host {
        display: block;
        max-width: 400px;
      }
      .kj-input {
        color: var(--kj-fg-default);
        border: var(--kj-border) solid var(--kj-border-default);
        border-radius: var(--kj-radius-field);
        padding: var(--kj-space-sm) var(--kj-space-md);
        font: var(--kj-text-sm) / 1.4 var(--kj-font-sans);
        width: 100%;
      }
      .kj-input[aria-invalid='true'] {
        border-color: var(--kj-fg-danger);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-field [kjInvalid]="invalid()">
      <kj-field-label>Email</kj-field-label>
      <input kjFieldControl class="kj-input" type="email" [value]="value()" (input)="onInput($event)" />
      <kj-field-help>Format: name@example.com</kj-field-help>
      <kj-field-error>Please enter a valid email address.</kj-field-error>
    </kj-field>
  `,
})
export class KjFieldWithErrorExample {
  readonly value = signal('not-an-email');
  // Derive invalid from the value — a real form would use FormControl +
  // Validators; this keeps the example dependency-free.
  readonly invalid = computed(() => !this.value().includes('@'));

  protected onInput(e: Event): void {
    this.value.set((e.target as HTMLInputElement).value);
  }
}
