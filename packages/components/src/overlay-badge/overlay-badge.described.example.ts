import { Component } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import { KjOverlayBadgeComponent } from './overlay-badge';

/**
 * Demonstrates `kjDescription` for AT context. The description text is
 * rendered in a visually-hidden span and its id is merged into the
 * anchor's `aria-describedby`. Without this wiring the badge would be
 * `aria-hidden` — a stray "248" with no context is worse than silence.
 *
 * The `kjValue` of `248` is also above the default `kjMaxValue` of `99`,
 * so it paints as `99+`.
 */
@Component({
  selector: 'kj-overlay-badge-described-example',
  standalone: true,
  imports: [KjOverlayBadgeComponent, KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-overlay-badge
      [kjValue]="248"
      kjVariant="destructive"
      kjDescription="More than 99 unread messages"
    >
      <kj-button kjVariant="secondary">Messages</kj-button>
    </kj-overlay-badge>
  `,
})
export class KjOverlayBadgeDescribedExample {}
