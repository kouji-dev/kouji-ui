import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

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
  template: `<kj-toggle [(pressed)]="bold" ariaLabel="Bold">B</kj-toggle>`,
})
export class KjToggleDefaultExample {
  readonly bold = signal(false);
}
