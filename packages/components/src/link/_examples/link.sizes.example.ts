import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjLinkComponent } from '../link';

@Component({
  selector: 'kj-link-sizes-example',
  standalone: true,
  imports: [KjLinkComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-link kjHref="/x" kjSize="sm" kjUnderline="always">Small link</kj-link>
    <kj-link kjHref="/x" kjSize="md" kjUnderline="always">Medium link</kj-link>
    <kj-link kjHref="/x" kjSize="lg" kjUnderline="always">Large link</kj-link>
    <p style="font-size: 1.25rem;">
      Inherits the surrounding text size:
      <kj-link kjHref="/x" kjSize="inherit">inline link</kj-link>.
    </p>
  `,
})
export class KjLinkSizesExample {}
