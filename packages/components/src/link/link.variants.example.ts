import { Component } from '@angular/core';
import { KjLinkComponent } from './link';

@Component({
  selector: 'kj-link-variants-example',
  standalone: true,
  imports: [KjLinkComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-lg);
        flex-wrap: wrap;
      }
    `,
  ],
  template: `
    <kj-link kjHref="/x" kjVariant="primary" kjUnderline="always">Primary</kj-link>
    <kj-link kjHref="/x" kjVariant="secondary" kjUnderline="always">Secondary</kj-link>
    <kj-link kjHref="/x" kjVariant="muted" kjUnderline="always">Muted</kj-link>
    <kj-link kjHref="/x" kjVariant="destructive" kjUnderline="always">Destructive</kj-link>
  `,
})
export class KjLinkVariantsExample {}
