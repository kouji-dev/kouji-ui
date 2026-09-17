import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjFieldControl } from '@kouji-ui/core';
import { KjFieldComponent, KjFieldHelpComponent, KjFieldLabelComponent } from '../field';

/**
 * Disabled field. The wrapper dims the whole row; the control reads
 * `f.disabled()` to disable itself.
 */
@Component({
  selector: 'kj-field-disabled-example',
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
      .kj-input:disabled {
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-field #f="kjField" [kjDisabled]="true">
      <kj-field-label>Username</kj-field-label>
      <input kjFieldControl class="kj-input" type="text" value="ada.lovelace" [disabled]="f.disabled()" />
      <kj-field-help>Contact support to change your username.</kj-field-help>
    </kj-field>
  `,
})
export class KjFieldDisabledExample {}
