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
 * A walkthrough of the most common empty-state usages — never-populated
 * neutral, search-no-results live-region neutral, and an error variant.
 */
@Component({
  selector: 'kj-empty-state-usage-example',
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
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
  `],
  template: `
    <kj-empty-state>
      <kj-empty-state-icon>📁</kj-empty-state-icon>
      <kj-empty-state-title>No projects yet</kj-empty-state-title>
      <kj-empty-state-description>Create your first project to get started.</kj-empty-state-description>
      <kj-empty-state-actions>
        <kj-button kjVariant="default">Create project</kj-button>
      </kj-empty-state-actions>
    </kj-empty-state>

    <kj-empty-state kjLive="polite">
      <kj-empty-state-icon>🔍</kj-empty-state-icon>
      <kj-empty-state-title>No results for "kouji"</kj-empty-state-title>
      <kj-empty-state-description>Try a different query or clear the filters.</kj-empty-state-description>
    </kj-empty-state>

    <kj-empty-state kjVariant="error" kjLive="assertive">
      <kj-empty-state-icon>⚠</kj-empty-state-icon>
      <kj-empty-state-title>Could not load projects</kj-empty-state-title>
      <kj-empty-state-description>Check your connection and try again.</kj-empty-state-description>
      <kj-empty-state-actions>
        <kj-button kjVariant="outline">Retry</kj-button>
      </kj-empty-state-actions>
    </kj-empty-state>
  `,
})
export class KjEmptyStateUsageExample {}
