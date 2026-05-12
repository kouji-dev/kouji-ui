import { Component } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-sizes-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-sm);
        align-items: center;
        flex-wrap: wrap;
      }
    `,
  ],
  template: `
    <kj-button kjSize="sm">Small</kj-button>
    <kj-button kjSize="md">Medium</kj-button>
    <kj-button kjSize="lg">Large</kj-button>
    <kj-button kjSize="icon" kjAriaLabel="Settings">⚙</kj-button>
  `,
})
export class KjButtonSizesExample {}
