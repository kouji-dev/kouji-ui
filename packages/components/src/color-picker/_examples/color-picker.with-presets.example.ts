import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjColorPickerComponent } from '../color-picker';
import type { KjColorPreset } from '@kouji-ui/core';

/**
 * Color-picker with a brand-palette preset row.
 */
@Component({
  selector: 'kj-color-picker-with-presets-example',
  standalone: true,
  imports: [KjColorPickerComponent, FormsModule],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center; min-height: 320px; }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-color-picker [(ngModel)]="hex" [kjPresets]="palette" />
    <code>{{ hex() }}</code>
  `,
})
export class KjColorPickerWithPresetsExample {
  readonly hex = signal('#3b82f6');
  readonly palette: readonly KjColorPreset[] = [
    { value: '#ef4444', label: 'Brand red' },
    { value: '#f97316', label: 'Brand orange' },
    { value: '#eab308', label: 'Brand yellow' },
    { value: '#22c55e', label: 'Brand green' },
    { value: '#06b6d4', label: 'Brand teal' },
    { value: '#3b82f6', label: 'Brand blue' },
    { value: '#8b5cf6', label: 'Brand violet' },
    { value: '#ec4899', label: 'Brand pink' },
  ];
}
