import { Component, signal } from '@angular/core';
import {
  KjMultiSelectComponent,
  KjMultiSelectOptionComponent,
} from './multi-select';

/**
 * Default usage example for KjMultiSelectComponent. Selected values render
 * as removable chips inside the trigger; clicking the panel toggles
 * options without closing.
 */
@Component({
  selector: 'kj-multi-select-example',
  standalone: true,
  imports: [KjMultiSelectComponent, KjMultiSelectOptionComponent],
  styles: [
    `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`,
  ],
  template: `
    <kj-multi-select [(value)]="tags" placeholder="Pick tags">
      <kj-multi-select-option [value]="'design'">Design</kj-multi-select-option>
      <kj-multi-select-option [value]="'engineering'">Engineering</kj-multi-select-option>
      <kj-multi-select-option [value]="'marketing'">Marketing</kj-multi-select-option>
      <kj-multi-select-option [value]="'product'">Product</kj-multi-select-option>
      <kj-multi-select-option [value]="'support'">Support</kj-multi-select-option>
    </kj-multi-select>
  `,
})
export class KjMultiSelectExample {
  protected readonly tags = signal<string[]>([]);
}
