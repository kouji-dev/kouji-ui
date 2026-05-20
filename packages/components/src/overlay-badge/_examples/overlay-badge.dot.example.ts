import { Component } from '@angular/core';
import { KjButtonComponent } from '../../button/button';
import { KjOverlayBadgeComponent } from '../overlay-badge';

/**
 * Presence-dot mode. The badge ignores `kjValue` / `kjMaxValue` and renders
 * a fixed-size dot. Useful for "new content" pips and online-status markers
 * where the count itself is not meaningful.
 */
@Component({
  selector: 'kj-overlay-badge-dot-example',
  standalone: true,
  imports: [KjOverlayBadgeComponent, KjButtonComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-overlay-badge [kjDot]="true" kjVariant="destructive" kjDescription="New activity">
      <kj-button kjVariant="secondary">Inbox</kj-button>
    </kj-overlay-badge>
  `,
})
export class KjOverlayBadgeDotExample {}
