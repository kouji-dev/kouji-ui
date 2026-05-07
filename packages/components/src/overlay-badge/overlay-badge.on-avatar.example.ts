import { Component } from '@angular/core';
import { KjAvatarComponent } from '../avatar/avatar';
import { KjOverlayBadgeComponent } from './overlay-badge';

/**
 * Status overlay on `<kj-avatar>`. Demonstrates the canonical anchor — a
 * presence dot in the bottom-end corner with a `kjDescription` so AT
 * announces "Avatar, Online" rather than just the avatar's accessible name.
 */
@Component({
  selector: 'kj-overlay-badge-on-avatar-example',
  standalone: true,
  imports: [KjOverlayBadgeComponent, KjAvatarComponent],
  styles: [`:host { display: flex; gap: var(--kj-space-xl); padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-overlay-badge
      [kjDot]="true"
      kjPosition="bottom-end"
      kjDescription="Online"
    >
      <kj-avatar content="AB" alt="Alex Brown" />
    </kj-overlay-badge>

    <kj-overlay-badge
      [kjDot]="true"
      kjPosition="bottom-end"
      kjVariant="secondary"
      kjDescription="Away"
    >
      <kj-avatar content="JM" alt="Jamie Morgan" />
    </kj-overlay-badge>
  `,
})
export class KjOverlayBadgeOnAvatarExample {}
