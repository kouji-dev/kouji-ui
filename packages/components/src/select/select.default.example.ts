import { Component, signal } from '@angular/core';
import { KjSelectComponent, KjOptionComponent } from './select';

@Component({
  selector: 'kj-select-default-example',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-select [(value)]="fruit" placeholder="Choose a fruit">
      <kj-option [value]="'apple'">Apple</kj-option>
      <kj-option [value]="'banana'">Banana</kj-option>
      <kj-option [value]="'cherry'">Cherry</kj-option>
    </kj-select>
  `,
})
export class KjSelectDefaultExample {
  readonly fruit = signal<string | undefined>(undefined);
}
