import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjEmptyStateComponent,
  KjEmptyStateTitleComponent,
  KjEmptyStateDescriptionComponent,
  KjEmptyStateActionsComponent,
} from './empty-state';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover the tonal variant,
 * title text, an optional description, and a primary-action toggle so the
 * actions slot can be exercised.
 */
const variant = signal<'neutral' | 'error'>('neutral');
const title = signal('No projects yet');
const description = signal('Create your first project to get started.');
const showAction = signal(true);

@Component({
  selector: 'kj-empty-state-playground',
  standalone: true,
  imports: [
    KjEmptyStateComponent,
    KjEmptyStateTitleComponent,
    KjEmptyStateDescriptionComponent,
    KjEmptyStateActionsComponent,
    KjButtonComponent,
  ],
  template: `
    <kj-empty-state [kjVariant]="variant()">
      <kj-empty-state-title>{{ title() }}</kj-empty-state-title>
      @if (description()) {
        <kj-empty-state-description>{{ description() }}</kj-empty-state-description>
      }
      @if (showAction()) {
        <kj-empty-state-actions>
          <kj-button kjVariant="default">Create project</kj-button>
        </kj-empty-state-actions>
      }
    </kj-empty-state>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjEmptyStatePlaygroundDemo {
  protected readonly variant = variant;
  protected readonly title = title;
  protected readonly description = description;
  protected readonly showAction = showAction;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjEmptyStatePlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    title: title as unknown as ReturnType<typeof signal>,
    description: description as unknown as ReturnType<typeof signal>,
    showAction: showAction as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'variant', label: 'variant', options: ['neutral', 'error'] },
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'text', name: 'description', label: 'description' },
    { kind: 'toggle', name: 'showAction', label: 'show action' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      title: string;
      description: string;
      showAction: boolean;
    };
    const lines: string[] = [`<kj-empty-state kjVariant="${s.variant}">`];
    lines.push(`  <kj-empty-state-title>${s.title}</kj-empty-state-title>`);
    if (s.description) {
      lines.push(`  <kj-empty-state-description>${s.description}</kj-empty-state-description>`);
    }
    if (s.showAction) {
      lines.push('  <kj-empty-state-actions>');
      lines.push('    <kj-button kjVariant="default">Create project</kj-button>');
      lines.push('  </kj-empty-state-actions>');
    }
    lines.push('</kj-empty-state>');
    return lines.join('\n');
  },
};
