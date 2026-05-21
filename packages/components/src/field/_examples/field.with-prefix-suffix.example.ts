import { Component } from '@angular/core';
import { KjAriaDescribedBy } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldGroupComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from '../field';

/**
 * `kj-field-group` lays out a leading prefix, the input, and a trailing
 * suffix as a single visual control. The inner `<input>` keeps full focus
 * and form semantics; the addons are presentational only.
 */
@Component({
  selector: 'kj-field-with-prefix-suffix-example',
  standalone: true,
  imports: [
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjFieldGroupComponent,
    KjAriaDescribedBy,
  ],
  styles: [
    `
      :host {
        display: block; max-width: 400px;
      }
      input.kj-bare {
        flex: 1;
        background: transparent;
        color: var(--kj-fg-default);
        border: 0;
        outline: none;
        padding: var(--kj-space-sm) var(--kj-space-md);
        font: var(--kj-text-sm) / 1.4 var(--kj-font-sans);
        width: 100%;
      }
    `,
  ],
  template: `
    <kj-field #f="kjField">
      <kj-field-label>Amount</kj-field-label>
      <kj-field-group>
        <span prefix>$</span>
        <input
          kjAriaDescribedBy
          class="kj-bare"
          type="number"
          placeholder="0.00"
          [id]="f.controlId()"
          [kjDescribedBy]="$any(f.describedByIds())"
        />
        <span suffix>USD</span>
      </kj-field-group>
      <kj-field-help>Enter the total in US dollars.</kj-field-help>
    </kj-field>
  `,
})
export class KjFieldWithPrefixSuffixExample {}
