import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMask, KJ_INPUT_MASK_PRESETS } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from '../../field/field';

/**
 * Date field using the `usDate` preset (`99/99/9999`).
 * Demonstrates a common calendar-adjacent use case.
 */
@Component({
  selector: 'kj-input-mask-date-example',
  standalone: true,
  imports: [
    FormsModule,
    KjInputMask,
    KjFieldComponent,
    KjFieldHelpComponent,
    KjFieldLabelComponent,
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
    .value-display {
      margin-top: var(--kj-space-md);
      font-size: var(--kj-text-xs);
      color: var(--kj-fg-muted);
      font-family: var(--kj-font-mono, monospace);
    }
  `],
  template: `
    <kj-field>
      <kj-field-label>Date of birth</kj-field-label>
      <input
        kjInputMask
        [kjMask]="presets.usDate"
        [(ngModel)]="date"
      />
      <kj-field-help>MM/DD/YYYY</kj-field-help>
    </kj-field>
    <p class="value-display">Raw value: {{ date() }}</p>
  `,
})
export class KjInputMaskDateExample {
  readonly presets = KJ_INPUT_MASK_PRESETS;
  readonly date = signal('');
}
