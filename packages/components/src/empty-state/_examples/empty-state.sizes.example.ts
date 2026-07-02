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
 * The three size presets stacked. `sm` fits inside a card body; `md` is
 * the default section-replacement size; `lg` is the full-route empty.
 */
@Component({
  selector: 'kj-empty-state-sizes-example',
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
      .stack {
        display: grid;
        gap: var(--kj-space-lg);
      }
      .stack > kj-empty-state {
        border-radius: var(--kj-radius-box);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="stack">
      <kj-empty-state kjSize="sm">
        <kj-empty-state-title>Small — inline</kj-empty-state-title>
        <kj-empty-state-description
          >Compact placeholder for cards or sidebar slots.</kj-empty-state-description
        >
        <kj-empty-state-actions>
          <kj-button kjSize="sm">Add item</kj-button>
        </kj-empty-state-actions>
      </kj-empty-state>

      <kj-empty-state kjSize="md">
        <kj-empty-state-title>Medium — section default</kj-empty-state-title>
        <kj-empty-state-description
          >The standard placement for an empty list, feed, or panel.</kj-empty-state-description
        >
        <kj-empty-state-actions>
          <kj-button>Add item</kj-button>
        </kj-empty-state-actions>
      </kj-empty-state>

      <kj-empty-state kjSize="lg">
        <kj-empty-state-title>Large — full page</kj-empty-state-title>
        <kj-empty-state-description
          >For empty routes — inboxes, dashboards, anything that takes the whole content
          area.</kj-empty-state-description
        >
        <kj-empty-state-actions>
          <kj-button kjSize="lg">Get started</kj-button>
        </kj-empty-state-actions>
      </kj-empty-state>
    </div>
  `,
})
export class KjEmptyStateSizesExample {}
