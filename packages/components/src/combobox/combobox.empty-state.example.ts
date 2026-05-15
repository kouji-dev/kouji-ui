import { Component, signal } from '@angular/core';
import {
  KjComboboxComponent,
  KjComboboxOptionComponent,
  KjComboboxEmptyComponent,
} from './combobox';

/**
 * Combobox with an empty-state slot — when the typed query matches nothing
 * in the option set, the `<kj-combobox-empty>` slot is announced (role
 * status, aria-live polite) instead of an empty list.
 */
@Component({
  selector: 'kj-combobox-empty-state-example',
  standalone: true,
  imports: [
    KjComboboxComponent,
    KjComboboxOptionComponent,
    KjComboboxEmptyComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-combobox [(value)]="fruit" placeholder="Try typing 'xyz'…">
      <kj-combobox-option [value]="'apple'">Apple</kj-combobox-option>
      <kj-combobox-option [value]="'banana'">Banana</kj-combobox-option>
      <kj-combobox-option [value]="'cherry'">Cherry</kj-combobox-option>
      <kj-combobox-empty>No fruit matches your search.</kj-combobox-empty>
    </kj-combobox>
  `,
})
export class KjComboboxEmptyStateExample {
  readonly fruit = signal<string | null>(null);
}
