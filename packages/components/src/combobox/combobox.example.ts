import { Component, signal } from '@angular/core';
import { KjComboboxComponent, KjComboboxOptionComponent } from './combobox';

/**
 * Default usage example for KjComboboxComponent — country picker with
 * synchronous filtering.
 */
@Component({
  selector: 'kj-combobox-example',
  standalone: true,
  imports: [KjComboboxComponent, KjComboboxOptionComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-combobox [(value)]="country" placeholder="Search countries…">
      <kj-combobox-option [value]="'fr'">France</kj-combobox-option>
      <kj-combobox-option [value]="'de'">Germany</kj-combobox-option>
      <kj-combobox-option [value]="'es'">Spain</kj-combobox-option>
      <kj-combobox-option [value]="'it'">Italy</kj-combobox-option>
      <kj-combobox-option [value]="'pt'">Portugal</kj-combobox-option>
      <kj-combobox-option [value]="'us'">United States</kj-combobox-option>
      <kj-combobox-option [value]="'gb'">United Kingdom</kj-combobox-option>
      <kj-combobox-option [value]="'jp'">Japan</kj-combobox-option>
      <kj-combobox-option [value]="'br'">Brazil</kj-combobox-option>
    </kj-combobox>
  `,
})
export class KjComboboxExample {
  readonly country = signal<string | null>(null);
}
