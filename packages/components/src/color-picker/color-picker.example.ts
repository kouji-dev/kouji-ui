import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjColorPickerComponent } from './color-picker';

/**
 * Default color-picker — hex output, no alpha, no presets.
 */
@Component({
  selector: 'kj-color-picker-example',
  standalone: true,
  imports: [KjColorPickerComponent, FormsModule],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center; min-height: 240px; }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-color-picker [(ngModel)]="hex" />
    <code>{{ hex() }}</code>
  `,
})
export class KjColorPickerExample {
  readonly hex = signal('#b8f500');
}
