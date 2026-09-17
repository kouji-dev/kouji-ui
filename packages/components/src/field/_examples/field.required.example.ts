import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjFieldControl } from '@kouji-ui/core';
import { KjFieldComponent, KjFieldHelpComponent, KjFieldLabelComponent } from '../field';

/**
 * Required field. Adds the visual `*` next to the label via `data-required`
 * and `kjFieldControl` reflects `aria-required` on the inner input.
 */
@Component({
  selector: 'kj-field-required-example',
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-field [kjRequired]="true">
      <kj-field-label>Full name</kj-field-label>
      <input kjFieldControl class="kj-input" type="text" placeholder="Ada Lovelace" />
      <kj-field-help>As it appears on your ID.</kj-field-help>
    </kj-field>
  `,
})
export class KjFieldRequiredExample {}
