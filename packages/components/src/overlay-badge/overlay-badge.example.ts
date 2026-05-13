import { Component } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import { KjOverlayBadgeComponent } from './overlay-badge';

/**
 * Default usage example for KjOverlayBadgeComponent.
 * Notification bell with an unread count and an accessible description so
 * AT hears "Notifications, 4 unread".
 */
@Component({
  selector: 'kj-overlay-badge-example',
  standalone: true,
  imports: [KjOverlayBadgeComponent, KjButtonComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-overlay-badge [kjValue]="4" kjVariant="destructive" kjDescription="4 unread notifications">
      <kj-button kjSize="icon" kjAriaLabel="Notifications">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1Z"/>
        </svg>
      </kj-button>
    </kj-overlay-badge>
  `,
})
export class KjOverlayBadgeExample {}
