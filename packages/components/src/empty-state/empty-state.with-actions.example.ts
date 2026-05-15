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
 * Primary action with an optional secondary row. Project secondary
 * affordances ("Learn more", "Contact support") via the `[secondary]`
 * attribute selector — they render in a smaller row beneath the
 * primary buttons.
 */
@Component({
  selector: 'kj-empty-state-with-actions-example',
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
    :host { display: block; }
    a { color: var(--kj-bg-primary, #2563eb); text-decoration: underline; }
  `],
  template: `
    <kj-empty-state>
      <kj-empty-state-icon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v20" />
          <path d="M2 12h20" />
        </svg>
      </kj-empty-state-icon>
      <kj-empty-state-title>Start a new workspace</kj-empty-state-title>
      <kj-empty-state-description>Workspaces let you separate clients, products, or environments.</kj-empty-state-description>
      <kj-empty-state-actions kjHasSecondary>
        <kj-button kjVariant="primary">Create workspace</kj-button>
        <kj-button kjVariant="ghost">Import existing</kj-button>
        <a secondary href="#">Learn more</a>
        <a secondary href="#">Contact support</a>
      </kj-empty-state-actions>
    </kj-empty-state>
  `,
})
export class KjEmptyStateWithActionsExample {}
