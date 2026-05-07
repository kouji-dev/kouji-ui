import { Component, signal } from '@angular/core';
import {
  KjMultiSelectComponent,
  KjMultiSelectGroupComponent,
  KjMultiSelectOptionComponent,
} from './multi-select';

/**
 * Grouped options inside Multi Select. Visual headings split the option
 * list into related sections without changing selection semantics; values
 * across groups are stored in the same selection array.
 */
@Component({
  selector: 'kj-multi-select-grouped-example',
  standalone: true,
  imports: [
    KjMultiSelectComponent,
    KjMultiSelectGroupComponent,
    KjMultiSelectOptionComponent,
  ],
  styles: [
    `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`,
  ],
  template: `
    <kj-multi-select [(value)]="cities" placeholder="Choose cities">
      <kj-multi-select-group label="Europe">
        <kj-multi-select-option [value]="'london'">London</kj-multi-select-option>
        <kj-multi-select-option [value]="'berlin'">Berlin</kj-multi-select-option>
        <kj-multi-select-option [value]="'paris'">Paris</kj-multi-select-option>
      </kj-multi-select-group>
      <kj-multi-select-group label="Asia">
        <kj-multi-select-option [value]="'tokyo'">Tokyo</kj-multi-select-option>
        <kj-multi-select-option [value]="'seoul'">Seoul</kj-multi-select-option>
        <kj-multi-select-option [value]="'singapore'">Singapore</kj-multi-select-option>
      </kj-multi-select-group>
    </kj-multi-select>
  `,
})
export class KjMultiSelectGroupedExample {
  protected readonly cities = signal<string[]>([]);
}
