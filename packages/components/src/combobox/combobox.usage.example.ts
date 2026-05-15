import { Component, signal } from '@angular/core';
import { KjComboboxComponent, KjComboboxOptionComponent } from './combobox';

/**
 * A walkthrough of the most common combobox usages — synchronous filtering,
 * a placeholder, two-way binding to a `signal`, and a disabled state.
 */
@Component({
  selector: 'kj-combobox-usage-example',
  standalone: true,
  imports: [KjComboboxComponent, KjComboboxOptionComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <kj-combobox [(value)]="framework" placeholder="Pick a framework…">
        <kj-combobox-option [value]="'angular'">Angular</kj-combobox-option>
        <kj-combobox-option [value]="'react'">React</kj-combobox-option>
        <kj-combobox-option [value]="'svelte'">Svelte</kj-combobox-option>
        <kj-combobox-option [value]="'vue'">Vue</kj-combobox-option>
      </kj-combobox>
      <code>{{ framework() ?? '—' }}</code>
    </div>

    <div class="row">
      <kj-combobox [disabled]="true" placeholder="Disabled">
        <kj-combobox-option [value]="'a'">A</kj-combobox-option>
      </kj-combobox>
    </div>
  `,
})
export class KjComboboxUsageExample {
  readonly framework = signal<string | null>('angular');
}
