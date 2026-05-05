import { Component } from '@angular/core';
import { KjButtonComponent } from './button';

/**
 * Default usage example for KjButtonComponent.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-button-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<kj-button variant="default">Click me</kj-button>`,
})
export class KjButtonExample {}
