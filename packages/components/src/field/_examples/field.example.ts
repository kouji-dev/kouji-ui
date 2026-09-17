import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjFieldControl } from '@kouji-ui/core';
import { KjFieldComponent, KjFieldHelpComponent, KjFieldLabelComponent } from '../field';

/**
 * Default usage example for `kj-field` — label + input + help text.
 * `kjFieldControl` on the input adopts the field's control id (so the label's
 * `for` resolves) and gets the help id as `aria-describedby`.
 */
@Component({
  selector: 'kj-field-default-example',
  standalone: true,
  imports: [KjFieldComponent, KjFieldLabelComponent, KjFieldHelpComponent, KjFieldControl],
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
      .kj-input:focus-visible {
        outline: 2px solid var(--kj-bg-primary);
        outline-offset: 2px;
        border-color: var(--kj-bg-primary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-field>
      <kj-field-label>Email</kj-field-label>
      <input kjFieldControl class="kj-input" type="email" placeholder="you@example.com" />
      <kj-field-help>We'll never share your email.</kj-field-help>
    </kj-field>
  `,
})
export class KjFieldExample {}
