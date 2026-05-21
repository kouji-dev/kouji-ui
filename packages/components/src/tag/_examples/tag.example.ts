import { Component } from '@angular/core';
import { KjTagComponent } from '../tag';

/**
 * Default usage example for KjTagComponent — a static decorative chip.
 * Visually identical to the matching `<kj-badge>`.
 */
@Component({
  selector: 'kj-tag-example',
  standalone: true,
  imports: [KjTagComponent],
  styles: [`:host { display: block; }`],
  template: `<kj-tag>New</kj-tag>`,
})
export class KjTagExample {}
