import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjToggleComponent } from '../toggle';

@Component({
  selector: 'kj-toggle-default-example',
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
  template: `<kj-toggle [(pressed)]="bold" ariaLabel="Bold">B</kj-toggle>`,
})
export class KjToggleDefaultExample {
  readonly bold = signal(false);
}
