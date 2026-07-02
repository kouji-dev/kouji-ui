import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjCheckboxComponent } from '../checkbox';

@Component({
  selector: 'kj-checkbox-checked-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-checkbox [(checked)]="value">Subscribed</kj-checkbox>`,
})
export class KjCheckboxCheckedExample {
  readonly value = signal(true);
}
