import { Component, signal } from '@angular/core';
import {
  KjMultiSelectComponent,
  KjMultiSelectOptionComponent,
} from './multi-select';

/**
 * Multi Select with the in-panel search filter enabled. The filter input
 * matches options case-insensitively against their projected text and
 * hides non-matching options.
 */
@Component({
  selector: 'kj-multi-select-with-search-example',
  standalone: true,
  imports: [KjMultiSelectComponent, KjMultiSelectOptionComponent],
  styles: [
    `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`,
  ],
  template: `
    <kj-multi-select
      [(value)]="cities"
      placeholder="Pick cities"
      searchPlaceholder="Search cities…"
      search
    >
      <kj-multi-select-option [value]="'london'">London</kj-multi-select-option>
      <kj-multi-select-option [value]="'paris'">Paris</kj-multi-select-option>
      <kj-multi-select-option [value]="'tokyo'">Tokyo</kj-multi-select-option>
      <kj-multi-select-option [value]="'sydney'">Sydney</kj-multi-select-option>
      <kj-multi-select-option [value]="'newyork'">New York</kj-multi-select-option>
      <kj-multi-select-option [value]="'berlin'">Berlin</kj-multi-select-option>
    </kj-multi-select>
  `,
})
export class KjMultiSelectWithSearchExample {
  protected readonly cities = signal<string[]>([]);
}
