import { Component } from '@angular/core';
import {
  KjEmptyStateComponent,
  KjEmptyStateIconComponent,
  KjEmptyStateTitleComponent,
  KjEmptyStateDescriptionComponent,
  KjEmptyStateActionsComponent,
} from './empty-state';
import { KjButtonComponent } from '../button/button';

/**
 * Default usage example for KjEmptyStateComponent — the never-populated case.
 * No `kjLive`: the page has just loaded and AT will read the content in flow.
 */
@Component({
  selector: 'kj-empty-state-example',
  standalone: true,
  imports: [
    KjEmptyStateComponent,
    KjEmptyStateIconComponent,
    KjEmptyStateTitleComponent,
    KjEmptyStateDescriptionComponent,
    KjEmptyStateActionsComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-empty-state>
      <kj-empty-state-icon aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      </kj-empty-state-icon>
      <kj-empty-state-title>No projects yet</kj-empty-state-title>
      <kj-empty-state-description>Create your first project to start collaborating with your team.</kj-empty-state-description>
      <kj-empty-state-actions>
        <kj-button kjVariant="primary">Create project</kj-button>
      </kj-empty-state-actions>
    </kj-empty-state>
  `,
})
export class KjEmptyStateExample {}
