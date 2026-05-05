import { Component } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-sizes-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-sm); align-items: center; flex-wrap: wrap; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-button size="sm">Small</kj-button>
    <kj-button size="md">Medium</kj-button>
    <kj-button size="lg">Large</kj-button>
    <kj-button size="icon" ariaLabel="Settings">⚙</kj-button>
  `,
})
export class KjButtonSizesExample {}
