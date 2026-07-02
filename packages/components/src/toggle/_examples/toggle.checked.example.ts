import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjToggleComponent } from '../toggle';

@Component({
  selector: 'kj-toggle-checked-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-toggle [(pressed)]="active" ariaLabel="Active">Active</kj-toggle>`,
})
export class KjToggleCheckedExample {
  readonly active = signal(true);
}
