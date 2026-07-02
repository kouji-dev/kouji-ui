import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMask } from '@kouji-ui/core';
import { KjFieldComponent, KjFieldHelpComponent, KjFieldLabelComponent } from '../../field/field';

/**
 * Default usage example — phone number mask.
 * Demonstrates `kjMaskMode="unmasked"` (default): the model value is raw
 * digits; the mask shape is only a display concern.
 */
@Component({
  selector: 'kj-input-mask-example',
  standalone: true,
  imports: [
    FormsModule,
    KjInputMask,
    KjFieldComponent,
    KjFieldLabelComponent,
    KjFieldHelpComponent,
  ],
  styles: [
    `
      :host {
        display: block;
        max-width: 400px;
      }
      input[kjInputMask] {
        color: var(--kj-fg-default);
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
      .value-display {
        margin-top: var(--kj-space-md);
        font-size: var(--kj-text-xs);
        color: var(--kj-fg-muted);
        font-family: var(--kj-font-mono, monospace);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-field>
      <kj-field-label>Phone number</kj-field-label>
      <input kjInputMask kjMask="(999) 999-9999" [(ngModel)]="phone" />
      <kj-field-help>Format: (###) ###-####</kj-field-help>
    </kj-field>
    <p class="value-display">Value: {{ phone() }}</p>
  `,
})
export class KjInputMaskExample {
  readonly phone = signal('');
}
