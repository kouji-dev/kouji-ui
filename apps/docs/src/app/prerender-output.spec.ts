import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Assertions about the **prerendered output** (`outputMode: "static"`).
 *
 * Two review findings are only observable in the emitted HTML:
 *
 *  - **SSR F-2** — every page used to prerender behind `<kj-loading-screen>`
 *    (`position: fixed; inset: 0; z-index: 9999`) with the shell carrying
 *    `visibility: hidden`, so the prerendered content was present but never
 *    painted without JS.
 *  - **SSR F-16** — no `/docs/*` page ever server-rendered a real library
 *    component: the demo resolved through a dynamic `import()` that the
 *    prerender did not wait for, so `expect(html).toContain('kj-editor')`
 *    passed on the *source code* printed into a `<pre>` and proved nothing.
 *
 * The suite skips when `dist/docs/browser` is absent so a plain `pnpm test`
 * stays fast; run `pnpm build:docs` first to exercise it.
 */
const DIST = resolve(__dirname, '../../../../dist/docs/browser');
const built = existsSync(DIST);

/** Resolve the prerendered HTML file for a route, whatever spelling is used. */
function pageFor(route: string): string | null {
  for (const candidate of [join(DIST, route, 'index.html'), join(DIST, `${route}.html`)]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8');
  }
  return null;
}

/** Every prerendered `index.html` under a directory, recursively. */
function allPages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) allPages(full, out);
    else if (entry === 'index.html') out.push(full);
  }
  return out;
}

/**
 * Whether the rendered shell carries the occluding state. Matching the bare
 * string `content-hidden` would also hit the inlined `.content-hidden` style
 * rule in `<head>`, which is expected to be there — only the class landing on
 * the element is the defect.
 */
function shellIsHidden(html: string): boolean {
  return /class="app-shell[^"]*\bcontent-hidden\b/.test(html);
}

describe.skipIf(!built)('prerendered output', () => {
  test('the home page ships real content, not a splash', () => {
    const html = pageFor('') ?? readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toContain('<h1');
    expect(html).not.toContain('<kj-loading-screen');
    expect(shellIsHidden(html)).toBe(false);
  });

  test('no prerendered page renders the splash or hides its shell', () => {
    const offenders = allPages(DIST).filter(f => {
      const html = readFileSync(f, 'utf8');
      return html.includes('<kj-loading-screen') || shellIsHidden(html);
    });
    expect(offenders).toEqual([]);
  });

  test('a component doc page server-renders a real kj component', () => {
    const html = pageFor('docs/components/button');
    expect(html, 'docs/components/button was not prerendered').not.toBeNull();
    // The playground stage mounts the live component during prerender, so the
    // rendered element — not its source text — is in the file.
    expect(html).toContain('class="playground-stage"');
    expect(html).toMatch(/<button[^>]*class="[^"]*\bkj-button\b/);
  });

  /**
   * The button page proves the mechanism; this proves it holds across the
   * catalogue. The playground stage is the only place a prerendered page
   * instantiates a library component, so this number *is* the SSR coverage:
   * if `PlaygroundRegistryService` stops blocking stability, or a batch of
   * loader keys goes stale after a class rename, the stages silently empty
   * out and nothing else in the suite notices.
   *
   * 60 of 69, not 69 of 69: `chart`, `editor` and `overflow` have no
   * playground registered for the symbol their page is built around, and the
   * floor leaves room for a page to be added before its playground is.
   */
  test('most component doc pages server-render their playground component', () => {
    const pages = allPages(join(DIST, 'docs', 'components'));
    expect(pages.length).toBeGreaterThan(60);

    const mounted = pages.filter(f => {
      const html = readFileSync(f, 'utf8');
      const open = html.indexOf('class="playground-stage"');
      if (open < 0) return false;
      const start = html.indexOf('>', open);
      const end = html.indexOf('class="playground-controls"', start);
      const stage = html.slice(start + 1, end > 0 ? end : start + 2000);
      // Any element at all: the stage is empty when the demo never resolved.
      return /<[a-z][a-z0-9-]*/.test(stage);
    });

    expect(mounted.length).toBeGreaterThanOrEqual(60);
  });

  test('the unrendered CSR shell still exists for unenumerated slugs', () => {
    // `PrerenderFallback.Client` on both slug routes leans on this file.
    expect(existsSync(join(DIST, 'index.csr.html'))).toBe(true);
  });
});
