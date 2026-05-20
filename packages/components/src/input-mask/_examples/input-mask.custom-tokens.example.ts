import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMask } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldHelpComponent,
  KjFieldLabelComponent,
} from '../../field/field';

/**
 * Custom-tokens example — hex colour code `#HHHHHH` using a per-instance
 * token `H` for `/[0-9A-Fa-f]/`.
 *
 * The `#` is treated as a literal (not in the token map), and the remaining
 * six positions accept only hexadecimal characters.
 */
@Component({
  selector: 'kj-input-mask-custom-tokens-example',
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
      font: var(--kj-text-sm) / 1.4 var(--kj-font-mono, monospace);
      font-variant-numeric: tabular-nums;
      width: 100%;
    }
    input[kjInputMask]:focus-visible {
      outline: 2px solid var(--kj-fg-primary);
      outline-offset: 2px;
      border-color: var(--kj-fg-primary);
    }
    .preview {
      margin-top: var(--kj-space-md);
      display: flex;
      align-items: center;
      gap: var(--kj-space-sm);
      font-size: var(--kj-text-sm);
      color: var(--kj-fg-default);
    }
    .swatch {
      display: inline-block;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.25rem;
      border: 1px solid var(--kj-border-default);
      flex-shrink: 0;
    }
  `],
  template: `
    <kj-field>
      <kj-field-label>Hex colour</kj-field-label>
      <input
        kjInputMask
        kjMask="#HHHHHH"
        [kjMaskTokens]="hexTokens"
        kjMaskMode="masked"
        [(ngModel)]="hex"
      />
      <kj-field-help>Six hexadecimal digits, e.g. #1A2B3C</kj-field-help>
    </kj-field>
    <div class="preview">
      <span
        class="swatch"
        [style.background]="hex().length === 7 ? hex() : 'transparent'"
      ></span>
      <span>{{ hex() }}</span>
    </div>
  `,
})
export class KjInputMaskCustomTokensExample {
  readonly hex = signal('#______');

  /** Per-instance token map: H = hex digit. */
  readonly hexTokens: Record<string, RegExp> = {
    H: /[0-9A-Fa-f]/,
  };
}
