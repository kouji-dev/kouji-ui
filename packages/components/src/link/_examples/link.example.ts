import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjLinkComponent } from '../link';

/**
 * Default usage example for KjLinkComponent.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-link-example',
  standalone: true,
  imports: [KjLinkComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <p>
      Visit <kj-link kjHref="/about">our about page</kj-link> for more information about kouji-ui.
    </p>
  `,
})
export class KjLinkExample {}
