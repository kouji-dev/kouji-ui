import { Component } from '@angular/core';
import { KjLinkComponent } from './link';

/**
 * Default usage example for KjLinkComponent.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-link-example',
  standalone: true,
  imports: [KjLinkComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<p>Read the <kj-link href="/docs">documentation</kj-link> or visit <kj-link href="https://github.com" external>GitHub</kj-link>.</p>`,
})
export class KjLinkExample {}
