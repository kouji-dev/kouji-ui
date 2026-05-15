import { Component } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import { KjOverlayBadgeComponent } from './overlay-badge';

/**
 * A walkthrough of the most common overlay-badge usages — a notification
 * count, a presence dot, and a truncated count over an icon button. Use this
 * as the copy-paste starting point for navbars and avatars.
 */
@Component({
  selector: 'kj-overlay-badge-usage-example',
  standalone: true,
  imports: [KjOverlayBadgeComponent, KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-xl); flex-wrap: wrap; align-items: center; }
  `],
  template: `
    <kj-overlay-badge [kjValue]="4" kjVariant="destructive" kjDescription="4 unread">
      <kj-button kjVariant="secondary">Inbox</kj-button>
    </kj-overlay-badge>

    <kj-overlay-badge [kjDot]="true" kjVariant="success" kjDescription="Online">
      <kj-button kjVariant="ghost">Profile</kj-button>
    </kj-overlay-badge>

    <kj-overlay-badge [kjValue]="120" [kjMaxValue]="99" kjVariant="default" kjDescription="120 messages">
      <kj-button kjVariant="outline">Messages</kj-button>
    </kj-overlay-badge>
  `,
})
export class KjOverlayBadgeUsageExample {}
