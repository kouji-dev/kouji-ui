import { Component } from '@angular/core';
import { KjLinkComponent } from './link';

@Component({
  selector: 'kj-link-sizes-example',
  standalone: true,
  imports: [KjLinkComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
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
