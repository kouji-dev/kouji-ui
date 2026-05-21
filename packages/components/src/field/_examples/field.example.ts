import { Component } from '@angular/core';
import { KjAriaDescribedBy } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from '../field';

/**
 * Default usage example for `kj-field` — label + input + help text.
 * The help id is auto-wired into the input's `aria-describedby` via the
 * `kjField` template ref's `describedByIds` signal.
 */
@Component({
  selector: 'kj-field-default-example',
  standalone: true,
  imports: [
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
    KjAriaDescribedBy,
  ],
  styles: [
    `
      :host {
        display: block; max-width: 400px;
      }
      .kj-input { color: var(--kj-fg-default);
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
  template: `
    <kj-field #f="kjField">
      <kj-field-label>Email</kj-field-label>
      <input
        kjAriaDescribedBy
        class="kj-input"
        type="email"
        placeholder="you@example.com"
        [id]="f.controlId()"
        [kjDescribedBy]="$any(f.describedByIds())"
      />
      <kj-field-help>We'll never share your email.</kj-field-help>
    </kj-field>
  `,
})
export class KjFieldExample {}
