import { Component } from '@angular/core';
import { KjInputComponent } from './input';

/**
 * Default usage example for KjInputComponent.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-input-example',
  standalone: true,
  imports: [KjInputComponent],
  styles: [`:host { display: block; }`],
  template: `<kj-input type="text" placeholder="Type something…"></kj-input>`,
})
export class KjInputExample {}
