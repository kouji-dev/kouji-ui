import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjColorPickerComponent, type KjColorPreset } from '../color-picker';

/**
 * A walkthrough of the most common color-picker usages — hex output, an alpha
 * channel for tinting, brand presets, and a disabled state.
 */
@Component({
  selector: 'kj-color-picker-usage-example',
  standalone: true,
  imports: [KjColorPickerComponent, FormsModule],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
      }
      .row {
        display: flex;
        gap: var(--kj-space-md);
        align-items: center;
      }
      code {
        font: 0.8125rem/1 var(--kj-font-mono, monospace);
        color: var(--kj-fg-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <kj-color-picker [(ngModel)]="brand" />
      <code>{{ brand() }}</code>
    </div>

    <div class="row">
      <kj-color-picker [(ngModel)]="tinted" kjShowAlpha />
      <code>{{ tinted() }}</code>
    </div>

    <div class="row">
      <kj-color-picker [(ngModel)]="brand" [kjPresets]="presets" />
      <code>preset palette</code>
    </div>
  `,
})
export class KjColorPickerUsageExample {
  readonly brand = signal('#b8f500');
  readonly tinted = signal('#1e90ffaa');
  readonly presets: readonly KjColorPreset[] = [
    { value: '#b8f500', label: 'Lime' },
    { value: '#1e90ff', label: 'Blue' },
    { value: '#f97316', label: 'Orange' },
    { value: '#a855f7', label: 'Purple' },
  ];
}
