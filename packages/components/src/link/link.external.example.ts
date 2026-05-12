import { Component } from '@angular/core';
import { KjLinkComponent } from './link';

@Component({
  selector: 'kj-link-external-example',
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
  template: `
    <p>
      Auto-detected from <code>target="_blank"</code>:
      <kj-link kjHref="https://example.com" kjTarget="_blank" kjUnderline="always">
        example.com </kj-link
      >.
    </p>
    <p>
      Explicit <code>kjExternal</code> for cross-origin URLs without <code>target="_blank"</code>:
      <kj-link kjHref="https://docs.example.com" [kjExternal]="true" kjUnderline="always">
        Docs </kj-link
      >.
    </p>
  `,
})
export class KjLinkExternalExample {}
