import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from '../select';
import { KjOptionGroup } from '../option-group';

@Component({
  selector: 'kj-select-searchable-example',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent, KjOptionGroup],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-select [(value)]="city" placeholder="Choose a city" kjSearchable kjSearchPlaceholder="Search cities">
      <kj-option-group kjLabel="Europe" kjCollapsible>
        <kj-option [value]="'london'">London</kj-option>
        <kj-option [value]="'berlin'">Berlin</kj-option>
        <kj-option [value]="'lisbon'">Lisbon</kj-option>
      </kj-option-group>
      <kj-option-group kjLabel="Asia" kjCollapsible [kjCollapsed]="true">
        <kj-option [value]="'tokyo'">Tokyo</kj-option>
        <kj-option [value]="'seoul'">Seoul</kj-option>
      </kj-option-group>
      <span kjSelectEmpty>No city matches</span>
    </kj-select>
  `,
})
export class KjSelectSearchableExample {
  readonly city = signal<string | undefined>(undefined);
}
