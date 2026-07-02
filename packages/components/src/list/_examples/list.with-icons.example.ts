import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjListComponent, KjListItemComponent } from '../list';

/**
 * Rows with leading icons (decorative, `aria-hidden="true"`) and trailing
 * badges. Demonstrates that the row is a flex slot — consumers compose
 * leading + body + trailing without needing named slots on the wrapper.
 *
 * The icon glyphs are pure unicode for example portability; production
 * usage would project an icon component (e.g. lucide-angular) instead.
 */
@Component({
  selector: 'kj-list-with-icons-example',
  standalone: true,
  imports: [KjListComponent, KjListItemComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .kj-list-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        font-size: 1rem;
        color: var(--kj-fg-default);
        opacity: 0.7;
      }
      .kj-list-body {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }
      .kj-list-title {
        font: 0.875rem / 1.4 var(--kj-font-sans);
        font-weight: 600;
        color: var(--kj-fg-default);
      }
      .kj-list-subtitle {
        font: 0.75rem / 1.3 var(--kj-font-sans);
        color: var(--kj-fg-default);
        opacity: 0.65;
      }
      .kj-list-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.5rem;
        padding: 0 var(--kj-space-sm);
        height: 1.5rem;
        border-radius: 9999px;
        background: var(--kj-bg-primary);
        color: var(--kj-fg-on-primary);
        font: 600 0.75rem / 1 var(--kj-font-sans);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-list ariaLabel="Inbox" [divided]="true" [hoverable]="true">
      <kj-list-item>
        <span class="kj-list-icon" aria-hidden="true">✉</span>
        <span class="kj-list-body">
          <span class="kj-list-title">Inbox</span>
          <span class="kj-list-subtitle">Mail and direct messages</span>
        </span>
        <span class="kj-list-badge" aria-label="12 unread">12</span>
      </kj-list-item>
      <kj-list-item>
        <span class="kj-list-icon" aria-hidden="true">★</span>
        <span class="kj-list-body">
          <span class="kj-list-title">Starred</span>
          <span class="kj-list-subtitle">Saved for later</span>
        </span>
        <span class="kj-list-badge" aria-label="3 items">3</span>
      </kj-list-item>
      <kj-list-item>
        <span class="kj-list-icon" aria-hidden="true">⏰</span>
        <span class="kj-list-body">
          <span class="kj-list-title">Snoozed</span>
          <span class="kj-list-subtitle">Coming back later</span>
        </span>
      </kj-list-item>
      <kj-list-item>
        <span class="kj-list-icon" aria-hidden="true">🗑</span>
        <span class="kj-list-body">
          <span class="kj-list-title">Trash</span>
          <span class="kj-list-subtitle">Auto-empties after 30 days</span>
        </span>
      </kj-list-item>
    </kj-list>
  `,
})
export class KjListWithIconsExample {}
