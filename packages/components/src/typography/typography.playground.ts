import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjLead, KjMuted, KjCode, KjBlockquote, KjTruncate } from '@kouji-ui/core';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs select which typographic
 * sample to show inside a `.kj-prose` container.
 */
const sample = signal<'prose' | 'lead' | 'muted' | 'code' | 'blockquote' | 'truncate'>('prose');
const truncateLines = signal<1 | 2 | 3>(2);

@Component({
  selector: 'kj-typography-playground',
  standalone: true,
  imports: [KjLead, KjMuted, KjCode, KjBlockquote, KjTruncate],
  template: `
    <article class="kj-prose">
      @switch (sample()) {
        @case ('prose') {
          <h1>kouji typography</h1>
          <p>
            Drop the <code>.kj-prose</code> container around any flow content and
            every descendant heading, paragraph, list, and inline element is
            restyled by the kouji type system.
          </p>
        }
        @case ('lead') {
          <p kjLead>
            A lead-in paragraph carries softer tone and a touch more size — used
            once near the top of an article.
          </p>
        }
        @case ('muted') {
          <p><span kjMuted>Last updated 3 minutes ago.</span></p>
        }
        @case ('code') {
          <p>Install with <code kjCode>pnpm add &#64;kouji-ui/components</code> and import the directive.</p>
        }
        @case ('blockquote') {
          <blockquote kjBlockquote>
            Typography is the craft of endowing human language with a durable visual form.
          </blockquote>
        }
        @case ('truncate') {
          <p [kjTruncate]="truncateLines()">
            A long line of body copy that gets clamped to the requested number of
            lines via the line-clamp tokens — useful inside cards, list rows, and
            other constrained layouts where overflow matters more than full
            disclosure.
          </p>
        }
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTypographyPlaygroundDemo {
  protected readonly sample = sample;
  protected readonly truncateLines = truncateLines;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTypographyPlaygroundDemo,
  state: {
    sample: sample as unknown as ReturnType<typeof signal>,
    truncateLines: truncateLines as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'sample',
      label: 'sample',
      options: ['prose', 'lead', 'muted', 'code', 'blockquote', 'truncate'],
    },
    { kind: 'chips', name: 'truncateLines', label: 'truncate lines', options: [1, 2, 3] },
  ],
  snippet: (values) => {
    const s = values as { sample: string; truncateLines: number };
    let body = '';
    switch (s.sample) {
      case 'lead':
        body = `  <p kjLead>A lead-in paragraph carries softer tone and a touch more size.</p>`;
        break;
      case 'muted':
        body = `  <p><span kjMuted>Last updated 3 minutes ago.</span></p>`;
        break;
      case 'code':
        body = `  <p>Install with <code kjCode>pnpm add &#64;kouji-ui/components</code>.</p>`;
        break;
      case 'blockquote':
        body = `  <blockquote kjBlockquote>Typography is the craft of endowing language with form.</blockquote>`;
        break;
      case 'truncate':
        body = `  <p [kjTruncate]="${s.truncateLines}">A long line of body copy clamped to ${s.truncateLines} line${s.truncateLines === 1 ? '' : 's'}.</p>`;
        break;
      default:
        body = `  <h1>kouji typography</h1>\n  <p>Drop <code>.kj-prose</code> around flow content to apply the type system.</p>`;
    }
    return `<article class="kj-prose">\n${body}\n</article>`;
  },
};
