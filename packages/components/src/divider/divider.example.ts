import { Component } from '@angular/core';
import { KjDividerComponent } from './divider';

/**
 * Default usage example for KjDividerComponent.
 * Renders a horizontal rule between two short text blocks so the
 * separator's spacing and stroke are visible against real content.
 */
@Component({
  selector: 'kj-divider-example',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <p>Above the divider — the first paragraph of content.</p>
    <kj-divider />
    <p>Below the divider — the second paragraph of content.</p>
  `,
})
export class KjDividerExample {}
