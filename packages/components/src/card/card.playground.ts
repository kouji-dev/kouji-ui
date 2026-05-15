import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjCardComponent,
  KjCardContentComponent,
  KjCardFooterComponent,
  KjCardHeaderComponent,
  KjCardSubtitleComponent,
  KjCardTitleComponent,
} from './card';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes variant, footer alignment,
 * and toggles header / footer slots so the full card composition can be
 * exercised without rewriting markup.
 */
const variant = signal<'default' | 'outline' | 'subtle'>('default');
const footerAlign = signal<'start' | 'center' | 'end' | 'between'>('end');
const showHeader = signal(true);
const showFooter = signal(true);
const title = signal('Card title');
const body = signal('Body content goes here. Cards group related information.');

@Component({
  selector: 'kj-card-playground',
  standalone: true,
  imports: [
    KjCardComponent,
    KjCardHeaderComponent,
    KjCardTitleComponent,
    KjCardSubtitleComponent,
    KjCardContentComponent,
    KjCardFooterComponent,
    KjButtonComponent,
  ],
  template: `
    <kj-card [variant]="variant()">
      @if (showHeader()) {
        <kj-card-header>
          <kj-card-title>{{ title() }}</kj-card-title>
          <kj-card-subtitle>Themed surface preview</kj-card-subtitle>
        </kj-card-header>
      }
      <kj-card-content>{{ body() }}</kj-card-content>
      @if (showFooter()) {
        <kj-card-footer [align]="footerAlign()">
          <kj-button kjVariant="ghost" kjSize="sm">Cancel</kj-button>
          <kj-button kjSize="sm">Save</kj-button>
        </kj-card-footer>
      }
    </kj-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCardPlaygroundDemo {
  protected readonly variant = variant;
  protected readonly footerAlign = footerAlign;
  protected readonly showHeader = showHeader;
  protected readonly showFooter = showFooter;
  protected readonly title = title;
  protected readonly body = body;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjCardPlaygroundDemo,
  state: {
    variant: variant as unknown as ReturnType<typeof signal>,
    footerAlign: footerAlign as unknown as ReturnType<typeof signal>,
    showHeader: showHeader as unknown as ReturnType<typeof signal>,
    showFooter: showFooter as unknown as ReturnType<typeof signal>,
    title: title as unknown as ReturnType<typeof signal>,
    body: body as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'variant',
      label: 'variant',
      options: ['default', 'outline', 'subtle'],
    },
    {
      kind: 'chips',
      name: 'footerAlign',
      label: 'footer align',
      options: ['start', 'center', 'end', 'between'],
    },
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'text', name: 'body', label: 'body' },
    { kind: 'toggle', name: 'showHeader', label: 'header' },
    { kind: 'toggle', name: 'showFooter', label: 'footer' },
  ],
  snippet: (values) => {
    const s = values as {
      variant: string;
      footerAlign: string;
      showHeader: boolean;
      showFooter: boolean;
      title: string;
      body: string;
    };
    const slots: string[] = [];
    if (s.showHeader) {
      slots.push(
        `  <kj-card-header>\n    <kj-card-title>${s.title}</kj-card-title>\n    <kj-card-subtitle>Themed surface preview</kj-card-subtitle>\n  </kj-card-header>`,
      );
    }
    slots.push(`  <kj-card-content>${s.body}</kj-card-content>`);
    if (s.showFooter) {
      slots.push(
        `  <kj-card-footer align="${s.footerAlign}">\n    <kj-button kjVariant="ghost" kjSize="sm">Cancel</kj-button>\n    <kj-button kjSize="sm">Save</kj-button>\n  </kj-card-footer>`,
      );
    }
    return `<kj-card variant="${s.variant}">\n${slots.join('\n')}\n</kj-card>`;
  },
};
