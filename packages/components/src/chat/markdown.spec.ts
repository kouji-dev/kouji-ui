import { marked } from 'marked';
import { describe, expect, it } from 'vitest';
import { createMarkdownRenderer, renderMarkdown, type KjMdBlock } from './markdown';

/**
 * `renderMarkdown` used to call `marked.use()` at module scope, configuring
 * the process-wide `marked` singleton for everyone who shares the install —
 * `breaks`, GFM and, more consequentially, the HTML-escaping renderers that
 * double as this module's sanitizer. These specs pin that the chat renders
 * through a private instance and that importing it leaves the global alone.
 */
describe('renderMarkdown — engine isolation', () => {
  it('never configures the shared marked singleton', () => {
    // Exercise every path that used to mutate the global.
    renderMarkdown('a\nb **c** <b>x</b>\n\n```ts\nlet x = 1;\n```');

    expect(marked.defaults.breaks).toBe(false);
    expect(marked.defaults.renderer).toBeNull();
    // The global keeps marked's own behaviour: raw HTML passes through.
    expect(marked.parse('<b>x</b>') as string).toContain('<b>x</b>');
    // …and a single newline is not a line break.
    expect(marked.parse('a\nb') as string).not.toContain('<br');
  });

  it('the private engine turns single newlines into <br> and escapes raw HTML', () => {
    const [breaks] = renderMarkdown('a\nb');
    expect(breaks.kind === 'prose' && breaks.html).toContain('<br');

    const [escaped] = renderMarkdown('<b>x</b>');
    const html = escaped.kind === 'prose' ? escaped.html : '';
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>');
  });

  it('keeps reference-style links working across the prose / code split', () => {
    const blocks = renderMarkdown('See [docs][d].\n\n```\ncode\n```\n\n[d]: https://example.com');
    const prose = blocks.find((b) => b.kind === 'prose');
    expect(prose && prose.kind === 'prose' ? prose.html : '').toContain('href="https://example.com"');
  });
});

/**
 * `createMarkdownRenderer` is the streaming path: a reply arrives token by
 * token, so the naive `renderMarkdown(content)` per token re-lexes and
 * re-parses the whole message each time (O(n²) over the reply).
 */
describe('createMarkdownRenderer — incremental streaming', () => {
  /** Everything the view actually renders, order preserved, grouping ignored. */
  const flatten = (blocks: readonly KjMdBlock[]): string =>
    blocks.map((b) => (b.kind === 'code' ? `«code:${b.lang}»${b.code}` : b.html)).join('');

  /** Feed `src` in `step`-sized chunks, returning the final blocks. */
  function stream(src: string, step = 7): KjMdBlock[] {
    const render = createMarkdownRenderer();
    for (let i = step; i < src.length; i += step) render(src.slice(0, i));
    return render(src);
  }

  const samples = [
    '## Primes\n\nTwo and three.\n\n- two\n- three\n\nThat is all.',
    'Intro line.\n\n```ts\nconst x = 1;\nconst y = 2;\n```\n\nOutro **bold** line.',
    '| a | b |\n| - | - |\n| 1 | 2 |\n\nAfter the table.\n\n> quoted\n\nend',
    '- a\n\n- b\n\n- c\n\nnot a list any more',
    'One paragraph that just keeps going and never has a blank line in it at all',
  ];

  it.each(samples)('streams to exactly what a full parse produces: %s', (src) => {
    expect(flatten(stream(src))).toBe(flatten(renderMarkdown(src)));
  });

  it('reuses the block objects it already parsed', () => {
    const render = createMarkdownRenderer();
    const first = render('First paragraph.\n\nSecond para');
    const second = render('First paragraph.\n\nSecond paragraph.\n\nThird');

    // The committed prefix is handed back by reference, so a downstream
    // `[innerHTML]` binding does not even re-sanitise it.
    expect(second[0]).toBe(first[0]);
    expect(second.length).toBeGreaterThan(first.length);
  });

  it('keeps an unclosed fence in the open block until it closes', () => {
    const render = createMarkdownRenderer();
    const open = render('Intro.\n\n```ts\nconst x = 1;');
    // An unterminated fence is still a code block, and it must stay re-lexable.
    expect(open.at(-1)?.kind).toBe('code');
    const closed = render('Intro.\n\n```ts\nconst x = 1;\n```\n\nDone.');
    expect(flatten(closed)).toBe(flatten(renderMarkdown('Intro.\n\n```ts\nconst x = 1;\n```\n\nDone.')));
  });

  it('falls back to a full parse when the source is rewritten, not appended', () => {
    const render = createMarkdownRenderer();
    render('Alpha.\n\nBeta.\n\nGamma');
    expect(flatten(render('Totally different.\n\nText.'))).toBe(
      flatten(renderMarkdown('Totally different.\n\nText.')),
    );
  });

  it('keeps reference-style links resolvable when the definition arrives last', () => {
    // A `[id]: url` line resolves links *above* it, so there is no safe commit
    // point once one appears — the renderer must fall back to a full parse.
    const src = 'See [docs][d].\n\nMore text.\n\n[d]: https://example.com';
    const render = createMarkdownRenderer();
    render('See [docs][d].\n\nMore text.\n\n');
    const blocks = render(src);
    expect(flatten(blocks)).toContain('href="https://example.com"');
    expect(flatten(blocks)).toBe(flatten(renderMarkdown(src)));
  });

  it('returns the identical array when called again with the same source', () => {
    const render = createMarkdownRenderer();
    const a = render('Stable.\n\nSource.');
    expect(render('Stable.\n\nSource.')).toBe(a);
  });
});
