import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjColorPickerComponent } from './color-picker';

/**
 * Color-picker that focuses on the hex text input — designers paste
 * hex values constantly; the panel commits on blur or Enter and
 * reverts on Escape if the value cannot be parsed.
 */
@Component({
  selector: 'kj-color-picker-hex-input-example',
  standalone: true,
  imports: [KjColorPickerComponent, FormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md);
            padding: var(--kj-space-xl); background: var(--kj-color-base-200);
            min-height: 280px; }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-color-neutral); }
    p { font: 0.8125rem var(--kj-font-sans); color: var(--kj-color-base-content);
        margin: 0; max-width: 28rem; }
  `],
  template: `
    <p>Open the panel and type or paste a hex value. The picker accepts
       3-, 4-, 6-, and 8-digit hex with or without the leading hash.</p>
    <div class="row">
      <kj-color-picker [(ngModel)]="hex" />
      <code>{{ hex() }}</code>
    </div>
  `,
})
export class KjColorPickerHexInputExample {
  readonly hex = signal('#0ea5e9');
}
