import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  KjEmptyStateComponent,
  KjEmptyStateIconComponent,
  KjEmptyStateTitleComponent,
  KjEmptyStateDescriptionComponent,
  KjEmptyStateActionsComponent,
} from '../empty-state';
import { KjButtonComponent } from '../../button/button';

/**
 * Error variant. `kjLive="assertive"` + `kjVariant="error"` → host gains
 * `role="alert"`; AT announces the failure assertively. Use for runtime
 * failures the user must act on. For recoverable errors where stale data
 * is still on screen, prefer a banner alert (planned).
 */
@Component({
  selector: 'kj-empty-state-error-example',
  standalone: true,
  imports: [
    KjEmptyStateComponent,
    KjEmptyStateIconComponent,
    KjEmptyStateTitleComponent,
    KjEmptyStateDescriptionComponent,
    KjEmptyStateActionsComponent,
    KjButtonComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-empty-state kjVariant="error" kjLive="assertive">
      <kj-empty-state-icon>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </kj-empty-state-icon>
      <kj-empty-state-title>We couldn't reach the server</kj-empty-state-title>
      <kj-empty-state-description
        >Check your connection and try again. If the problem keeps happening, contact
        support.</kj-empty-state-description
      >
      <kj-empty-state-actions>
        <kj-button kjVariant="primary">Retry</kj-button>
      </kj-empty-state-actions>
    </kj-empty-state>
  `,
})
export class KjEmptyStateErrorExample {}
