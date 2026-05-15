import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertDismissComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
} from './alert';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs cover severity, size,
 * banner mode, dismiss button, and the action row to exercise every slot
 * on the alert composition.
 */
const variant = signal<'info' | 'success' | 'warning' | 'error'>('info');
const size = signal<'sm' | 'md' | 'lg'>('md');
const banner = signal(false);
const dismissible = signal(false);
const withActions = signal(false);
const title = signal('Heads up');
const description = signal('New theme tokens just landed — try the dark variant in your settings.');

@Component({
  selector: 'kj-alert-playground',
  standalone: true,
  imports: [
    KjAlertComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
    KjAlertDismissComponent,
    KjButtonComponent,
  ],
  template: `
    <kj-alert
      [kjVariant]="variant()"
      [kjSize]="size()"
      [kjAlertStatic]="banner()"
    >
      <kj-alert-icon>i</kj-alert-icon>
      <kj-alert-title>{{ title() }}</kj-alert-title>
      <kj-alert-description>{{ description() }}</kj-alert-description>
      @if (withActions()) {
        <kj-button kjVariant="outline" kjSize="sm">Retry</kj-button>
      }
      @if (dismissible()) {
        <kj-alert-dismiss />
      }
    </kj-alert>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertPlaygroundDemo {
  protected readonly variant = variant;
  protected readonly size = size;
  protected readonly banner = banner;
  protected readonly dismissible = dismissible;
  protected readonly withActions = withActions;
  protected readonly title = title;
  protected readonly description = description;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjAlertPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
    banner: banner as unknown as ReturnType<typeof signal>,
    dismissible: dismissible as unknown as ReturnType<typeof signal>,
    withActions: withActions as unknown as ReturnType<typeof signal>,
    title: title as unknown as ReturnType<typeof signal>,
    description: description as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['info', 'success', 'warning', 'error'],
    },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'text', name: 'description', label: 'description' },
    { kind: 'toggle', name: 'banner', label: 'banner mode' },
    { kind: 'toggle', name: 'dismissible', label: 'dismissible' },
    { kind: 'toggle', name: 'withActions', label: 'with action' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      size: string;
      banner: boolean;
      dismissible: boolean;
      withActions: boolean;
      title: string;
      description: string;
    };
    const attrs: string[] = [`kjVariant="${s.variant}"`, `kjSize="${s.size}"`];
    if (s.banner) attrs.push('[kjAlertStatic]="true"');
    const slots: string[] = [
      `  <kj-alert-icon>i</kj-alert-icon>`,
      `  <kj-alert-title>${s.title}</kj-alert-title>`,
      `  <kj-alert-description>${s.description}</kj-alert-description>`,
    ];
    if (s.withActions) slots.push(`  <kj-button kjVariant="outline" kjSize="sm">Retry</kj-button>`);
    if (s.dismissible) slots.push(`  <kj-alert-dismiss />`);
    return `<kj-alert\n  ${attrs.join('\n  ')}\n>\n${slots.join('\n')}\n</kj-alert>`;
  },
};
