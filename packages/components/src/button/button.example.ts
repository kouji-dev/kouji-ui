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
  styles: [`:host { display: block; }`],
  template: `<kj-button kjVariant="default">Click me</kj-button>`,
})
export class KjButtonExample {}
