import { Component, signal } from '@angular/core';
import {
  KjMultiSelectComponent,
  KjMultiSelectOptionComponent,
} from './multi-select';

/**
 * Multi Select with a hard cap on the number of selectable values
 * (`[max]="3"`). Once three options are selected, clicking any
 * additional option is dropped silently — the cap protects the
 * downstream form state from oversized arrays.
 */
@Component({
  selector: 'kj-multi-select-max-items-example',
  standalone: true,
  imports: [KjMultiSelectComponent, KjMultiSelectOptionComponent],
  styles: [
    `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`,
  ],
  template: `
    <kj-multi-select
      [(value)]="skills"
      [max]="3"
      placeholder="Pick up to 3 skills"
    >
      <kj-multi-select-option [value]="'angular'">Angular</kj-multi-select-option>
      <kj-multi-select-option [value]="'react'">React</kj-multi-select-option>
      <kj-multi-select-option [value]="'vue'">Vue</kj-multi-select-option>
      <kj-multi-select-option [value]="'svelte'">Svelte</kj-multi-select-option>
      <kj-multi-select-option [value]="'solid'">Solid</kj-multi-select-option>
    </kj-multi-select>
    <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.7;">
      Selected: {{ skills().length }} / 3
    </p>
  `,
})
export class KjMultiSelectMaxItemsExample {
  protected readonly skills = signal<string[]>([]);
}
