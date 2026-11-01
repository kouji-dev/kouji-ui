import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from '../select';
import { KjOptionGroup } from '../option-group';

@Component({
  selector: 'kj-select-grouped-example',
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
    <kj-select [(value)]="city" placeholder="Choose a city">
      <kj-option-group kjLabel="Europe" kjCollapsible [(kjCollapsed)]="europeFolded">
        <kj-option [value]="'london'">London</kj-option>
        <kj-option [value]="'berlin'">Berlin</kj-option>
      </kj-option-group>
      <kj-option-group kjLabel="Asia" kjCollapsible>
        <kj-option [value]="'tokyo'">Tokyo</kj-option>
        <kj-option [value]="'seoul'">Seoul</kj-option>
      </kj-option-group>
    </kj-select>
  `,
})
export class KjSelectGroupedExample {
  readonly city = signal<string | undefined>(undefined);
  readonly europeFolded = signal(false);
}
