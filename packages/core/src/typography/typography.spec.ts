import { render } from '@testing-library/angular';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KjBlockquote } from './blockquote';
import { KjCode } from './code';
import { KjLead } from './lead';
import { KjMuted } from './muted';
import { KjTruncate } from './truncate';

/**
 * Flush microtasks + the rAF that backs `afterNextRender` so the directives'
 * dev-mode host inspections and `KjTruncate`'s `title` injection have a
 * chance to run.
 */
async function flushAfterNextRender(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('Typography directives', () => {
  afterEach(() => vi.restoreAllMocks());

  describe('KjLead', () => {
    it('reflects data-tone="lead" on the host', async () => {
      const { container } = await render(`<p kjLead>Lead paragraph.</p>`, {
        imports: [KjLead],
      });
      await flushAfterNextRender();
      expect(container.querySelector('p')).toHaveAttribute('data-tone', 'lead');
    });

    it('does not warn on a <p> host', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<p kjLead>Lead.</p>`, { imports: [KjLead] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) => /kjLead applied to/i.test(String(c[0])));
      expect(matched).toBe(false);
    });

    it('warns when applied to a non-<p> host', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<span kjLead>Lead-ish.</span>`, { imports: [KjLead] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) => {
        const msg = String(c[0]);
        return /kjLead applied to <span>/i.test(msg) && /<p>/.test(msg);
      });
      expect(matched).toBe(true);
    });
  });

  describe('KjMuted', () => {
    it('reflects data-tone="muted" on the host', async () => {
      const { container } = await render(`<small kjMuted>Meta line.</small>`, {
        imports: [KjMuted],
      });
      expect(container.querySelector('small')).toHaveAttribute('data-tone', 'muted');
    });

    it('works on any phrasing element (<span>)', async () => {
      const { container } = await render(`<span kjMuted>Note</span>`, {
        imports: [KjMuted],
      });
      expect(container.querySelector('span')).toHaveAttribute('data-tone', 'muted');
    });
  });

  describe('KjCode', () => {
    it('reflects data-tone="code" on the host', async () => {
      const { container } = await render(`<code kjCode>npm install</code>`, {
        imports: [KjCode],
      });
      await flushAfterNextRender();
      expect(container.querySelector('code')).toHaveAttribute('data-tone', 'code');
    });

    it('does not warn on a <code> host', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<code kjCode>x</code>`, { imports: [KjCode] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) => /kjCode applied to/i.test(String(c[0])));
      expect(matched).toBe(false);
    });

    it('warns when applied to a non-<code> host (e.g. <span>)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<span kjCode>x</span>`, { imports: [KjCode] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) => {
        const msg = String(c[0]);
        return /kjCode applied to <span>/i.test(msg) && /<code>/.test(msg);
      });
      expect(matched).toBe(true);
    });
  });

  describe('KjBlockquote', () => {
    it('reflects data-tone="blockquote" on the host', async () => {
      const { container } = await render(`<blockquote kjBlockquote>Quote</blockquote>`, {
        imports: [KjBlockquote],
      });
      await flushAfterNextRender();
      expect(container.querySelector('blockquote')).toHaveAttribute(
        'data-tone',
        'blockquote',
      );
    });

    it('does not warn on a <blockquote> host', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<blockquote kjBlockquote>x</blockquote>`, {
        imports: [KjBlockquote],
      });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) =>
        /kjBlockquote applied to/i.test(String(c[0])),
      );
      expect(matched).toBe(false);
    });

    it('warns when applied to a non-<blockquote> host (e.g. <div>)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await render(`<div kjBlockquote>x</div>`, { imports: [KjBlockquote] });
      await flushAfterNextRender();
      const matched = warn.mock.calls.some((c) => {
        const msg = String(c[0]);
        return /kjBlockquote applied to <div>/i.test(msg) && /<blockquote>/.test(msg);
      });
      expect(matched).toBe(true);
    });
  });

  describe('KjTruncate', () => {
    it('defaults to data-truncate="1"', async () => {
      const { container } = await render(`<p kjTruncate>Some long text.</p>`, {
        imports: [KjTruncate],
      });
      await flushAfterNextRender();
      expect(container.querySelector('p')).toHaveAttribute('data-truncate', '1');
    });

    it('reflects [kjTruncate]="3" as data-truncate="3"', async () => {
      const { container } = await render(
        `<p [kjTruncate]="3">Some long text spanning multiple lines.</p>`,
        { imports: [KjTruncate] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('p')).toHaveAttribute('data-truncate', '3');
    });

    it('injects [title] from textContent when consumer has not supplied title/aria-label', async () => {
      const { container } = await render(
        `<p kjTruncate>Atlas helps engineering teams plan.</p>`,
        { imports: [KjTruncate] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('p')).toHaveAttribute(
        'title',
        'Atlas helps engineering teams plan.',
      );
    });

    it('normalises whitespace (trim + collapse runs) when injecting title', async () => {
      const { container } = await render(
        `<p kjTruncate>   Lots    of\n   whitespace   </p>`,
        { imports: [KjTruncate] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('p')).toHaveAttribute(
        'title',
        'Lots of whitespace',
      );
    });

    it('does not overwrite a consumer-supplied title', async () => {
      const { container } = await render(
        `<p kjTruncate title="Custom tooltip">The visible text.</p>`,
        { imports: [KjTruncate] },
      );
      await flushAfterNextRender();
      expect(container.querySelector('p')).toHaveAttribute('title', 'Custom tooltip');
    });

    it('does not inject title when aria-label is consumer-supplied', async () => {
      const { container } = await render(
        `<p kjTruncate aria-label="Friendly summary">The visible text.</p>`,
        { imports: [KjTruncate] },
      );
      await flushAfterNextRender();
      const host = container.querySelector('p');
      expect(host).not.toHaveAttribute('title');
      expect(host).toHaveAttribute('aria-label', 'Friendly summary');
    });

    it('does not set title when textContent is empty', async () => {
      const { container } = await render(`<p kjTruncate></p>`, {
        imports: [KjTruncate],
      });
      await flushAfterNextRender();
      expect(container.querySelector('p')).not.toHaveAttribute('title');
    });
  });
});
