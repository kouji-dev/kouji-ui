import { Component, signal } from '@angular/core';
import { KjComboboxComponent, KjComboboxOptionComponent } from './combobox';

/**
 * Free-text combobox — `freeText=true` lets the user commit any typed
 * string (canonical "tags" / "categories" pattern). Pressing Enter when no
 * option matches commits the typed string as the value.
 */
@Component({
  selector: 'kj-combobox-free-text-example',
  standalone: true,
  imports: [KjComboboxComponent, KjComboboxOptionComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .out {
        font: 0.875rem var(--kj-font-mono, monospace);
        margin-top: var(--kj-space-md);
        color: var(--kj-color-base-content);
      }
    `,
  ],
  template: `
    <kj-combobox
      [(value)]="tag"
      [freeText]="true"
      [autoActivateFirst]="false"
      placeholder="Type a tag and press Enter…"
    >
      <kj-combobox-option [value]="'design'">Design</kj-combobox-option>
      <kj-combobox-option [value]="'engineering'">Engineering</kj-combobox-option>
      <kj-combobox-option [value]="'research'">Research</kj-combobox-option>
    </kj-combobox>
    <p class="out">Selected: {{ tag() ?? '(none)' }}</p>
  `,
})
export class KjComboboxFreeTextExample {
  readonly tag = signal<string | null>(null);
}
