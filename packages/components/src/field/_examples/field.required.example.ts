import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjAriaDescribedBy } from '@kouji-ui/core';
import { KjFieldComponent, KjFieldHelpComponent, KjFieldLabelComponent } from '../field';

/**
 * Required field. Adds the visual `*` next to the label via `data-required`
 * and reflects `aria-required` on the inner input.
 */
@Component({
  selector: 'kj-field-required-example',
  standalone: true,
  imports: [KjFieldComponent, KjFieldLabelComponent, KjFieldHelpComponent, KjAriaDescribedBy],
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-field #f="kjField" [kjRequired]="true">
      <kj-field-label>Full name</kj-field-label>
      <input
        kjAriaDescribedBy
        class="kj-input"
        type="text"
        placeholder="Ada Lovelace"
        [id]="f.controlId()"
        [attr.aria-required]="f.required() ? 'true' : null"
        [kjDescribedBy]="$any(f.describedByIds())"
      />
      <kj-field-help>As it appears on your ID.</kj-field-help>
    </kj-field>
  `,
})
export class KjFieldRequiredExample {}
