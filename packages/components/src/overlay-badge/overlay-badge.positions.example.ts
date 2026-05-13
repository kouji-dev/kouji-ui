import { Component } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import { KjOverlayBadgeComponent } from './overlay-badge';

/**
 * The four logical-corner positions. `start` / `end` keywords flip in RTL
 * via CSS logical properties — no JS bidi reads.
 */
@Component({
  selector: 'kj-overlay-badge-positions-example',
  standalone: true,
  imports: [KjOverlayBadgeComponent, KjButtonComponent],
  styles: [`
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--kj-space-2xl);
      padding: var(--kj-space-2xl); }
  `],
  template: `
    <kj-overlay-badge [kjValue]="3" kjPosition="top-end" kjDescription="3 unread">
      <kj-button kjVariant="secondary">top-end</kj-button>
    </kj-overlay-badge>
    <kj-overlay-badge [kjValue]="3" kjPosition="top-start" kjDescription="3 unread">
      <kj-button kjVariant="secondary">top-start</kj-button>
    </kj-overlay-badge>
    <kj-overlay-badge [kjValue]="3" kjPosition="bottom-end" kjDescription="3 unread">
      <kj-button kjVariant="secondary">bottom-end</kj-button>
    </kj-overlay-badge>
    <kj-overlay-badge [kjValue]="3" kjPosition="bottom-start" kjDescription="3 unread">
      <kj-button kjVariant="secondary">bottom-start</kj-button>
    </kj-overlay-badge>
  `,
})
export class KjOverlayBadgePositionsExample {}
