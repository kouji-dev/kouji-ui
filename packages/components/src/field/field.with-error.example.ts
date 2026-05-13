import { Component, computed, signal } from '@angular/core';
import { KjAriaDescribedBy } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldErrorComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from './field';

/**
 * `kj-field` showing an error message. The error registers its id with the
 * field; when `kjInvalid` is true the field swaps the help-id for the
 * error-id in the inner input's `aria-describedby` and toggles the help /
 * error visibility.
 */
@Component({
  selector: 'kj-field-with-error-example',
  standalone: true,
  imports: [
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjFieldErrorComponent,
    KjAriaDescribedBy,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: var(--kj-space-xl);
        background: var(--kj-bg-surface);
        max-width: 400px;
      }
      .kj-input {
        background: var(--kj-bg-body);
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
  template: `
    <kj-field #f="kjField" [kjInvalid]="invalid()">
      <kj-field-label>Email</kj-field-label>
      <input
        kjAriaDescribedBy
        class="kj-input"
        type="email"
        [id]="f.controlId()"
        [value]="value()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [kjDescribedBy]="$any(f.describedByIds())"
        (input)="onInput($event)"
      />
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
