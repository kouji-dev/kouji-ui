import { Component, signal } from '@angular/core';
import {
  KjEmptyStateComponent,
  KjEmptyStateIconComponent,
  KjEmptyStateTitleComponent,
  KjEmptyStateDescriptionComponent,
  KjEmptyStateActionsComponent,
} from './empty-state';
import { KjButtonComponent } from '../button/button';

/**
 * Search-no-results case. `kjLive="polite"` + neutral variant → host
 * gains `role="status"`; AT announces the result politely without
 * stealing focus. This is the central use case for the live region —
 * the result set just collapsed in response to user typing, so the
 * user needs to be told even if focus is still inside the input.
 */
@Component({
  selector: 'kj-empty-state-search-example',
  standalone: true,
  imports: [
    KjEmptyStateComponent,
    KjEmptyStateIconComponent,
    KjEmptyStateTitleComponent,
    KjEmptyStateDescriptionComponent,
    KjEmptyStateActionsComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .search { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    input { padding: var(--kj-space-sm) var(--kj-space-md); border: 1px solid var(--kj-border-default); border-radius: var(--kj-radius-field, 0.5rem); }
  `],
  template: `
    <div class="search">
      <input
        type="search"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
        placeholder="Search…"
      />
      <kj-empty-state kjLive="polite">
        <kj-empty-state-icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </kj-empty-state-icon>
        <kj-empty-state-title>No results match "{{ query() || 'octopus' }}"</kj-empty-state-title>
        <kj-empty-state-description>Try adjusting your search or clearing filters.</kj-empty-state-description>
        <kj-empty-state-actions>
          <kj-button kjVariant="ghost" (click)="query.set('')">Clear search</kj-button>
        </kj-empty-state-actions>
      </kj-empty-state>
    </div>
  `,
})
export class KjEmptyStateSearchExample {
  readonly query = signal('octopus');
}
