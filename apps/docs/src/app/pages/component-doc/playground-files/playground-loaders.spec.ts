import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PLAYGROUND_LOADERS, hasPlayground } from './index';

/**
 * Bundle-shape guard for the playground registry (lazy-loading review F-1).
 *
 * The registry used to hold 69 live `Type<unknown>` references in a
 * module-scope object literal, which pinned most of `@kouji-ui/components`
 * into the single chunk every `/docs/*` slug route downloads. Nothing about
 * `"sideEffects": false` can shake a class reference out of an object literal,
 * so the only fix is to stop holding them — hence loaders.
 *
 * These tests assert the property directly (values are thunks) and guard the
 * mechanism at the source level (no bucket may statically import a playground
 * module again), because a single re-introduced `import { PLAYGROUND … }`
 * silently restores the old behaviour with no visible symptom in any test that
 * only checks that playgrounds still work.
 */
describe('PLAYGROUND_LOADERS', () => {
  const BUCKETS_DIR = __dirname;

  test('holds one loader per registered symbol, and every value is a thunk', () => {
    const entries = Object.entries(PLAYGROUND_LOADERS);
    expect(entries.length).toBeGreaterThanOrEqual(60);
    for (const [symbol, loader] of entries) {
      expect(typeof loader, `${symbol} is not a function`).toBe('function');
      // A thunk takes no arguments; a memoised object would fail the typeof
      // check above, and a bound component factory would report arity.
      expect(loader.length, `${symbol} takes arguments`).toBe(0);
    }
  });

  test('no bucket statically imports a playground module', () => {
    const buckets = readdirSync(BUCKETS_DIR).filter(f => /^bucket-[a-f]\.ts$/.test(f));
    expect(buckets.length).toBe(6);
    for (const file of buckets) {
      const source = readFileSync(resolve(BUCKETS_DIR, file), 'utf8');
      const staticImports = [...source.matchAll(/^import\s+(?!type\b)[^\n]*from\s+'[^']*'/gm)]
        .map(m => m[0]);
      expect(staticImports, `${file} statically imports a module`).toEqual([]);
      expect(source).toMatch(/=>\s*import\(/);
    }
  });

  test('the aggregate index only imports the buckets and the loader type', () => {
    const source = readFileSync(resolve(BUCKETS_DIR, 'index.ts'), 'utf8');
    const valueImports = [...source.matchAll(/^import\s+(?!type\b)[^\n]*from\s+'([^']*)'/gm)]
      .map(m => m[1]);
    expect(valueImports.every(spec => /^\.\/bucket-[a-f]$/.test(spec))).toBe(true);
  });

  /**
   * A loader key is a `DocItem.symbol` — the exported class / function the
   * docs page is built around — and nothing links the two. Renaming
   * `KjCardComponent` to `KjCard` in `packages/components` leaves the key
   * behind, `hasPlayground()` answers false, and the page simply renders no
   * Playground: no build error, no failing test, no console warning. That is
   * exactly what happened to six keys during the rename sweep and it was only
   * visible by reading the prerendered HTML.
   *
   * Scanning the two packages for exported symbol names is a cheap proxy for
   * the manifest (which needs ts-morph over the whole tree): a key naming a
   * symbol that no longer exists anywhere is always stale, whatever the
   * extractor would have said about it.
   */
  test('every loader key names a symbol the library still exports', () => {
    const PKG_SRC = [
      resolve(BUCKETS_DIR, '../../../../../../../packages/core/src'),
      resolve(BUCKETS_DIR, '../../../../../../../packages/components/src'),
    ];
    const exported = new Set<string>();
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) {
          const src = readFileSync(full, 'utf8');
          for (const m of src.matchAll(
            /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const)\s+([A-Za-z0-9_]+)/gm,
          )) {
            exported.add(m[1]);
          }
        }
      }
    };
    for (const dir of PKG_SRC) walk(dir);
    // Sanity: the scan found the packages, not an empty tree.
    expect(exported.size).toBeGreaterThan(500);

    const stale = Object.keys(PLAYGROUND_LOADERS).filter(k => !exported.has(k));
    expect(stale, 'playground keys naming symbols that no longer exist').toEqual([]);
  });

  /**
   * Buckets are spread in order, so two buckets registering the same symbol
   * silently drop one of them. Identical targets are allowed (the same
   * playground is legitimately reachable from two doc pages); a *conflict* is
   * the bug.
   */
  test('no two buckets register the same symbol with different targets', () => {
    const seen = new Map<string, string>();
    const conflicts: string[] = [];
    for (const file of readdirSync(BUCKETS_DIR).filter(f => /^bucket-[a-f]\.ts$/.test(f))) {
      const source = readFileSync(resolve(BUCKETS_DIR, file), 'utf8');
      for (const m of source.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\(\)\s*=>\s*import\('([^']+)'\)/gm)) {
        const [, symbol, target] = m;
        const prev = seen.get(symbol);
        if (prev && prev !== target) conflicts.push(`${symbol}: ${prev} vs ${target}`);
        seen.set(symbol, target);
      }
    }
    expect(conflicts).toEqual([]);
  });

  test('hasPlayground answers without loading anything', () => {
    expect(hasPlayground('KjButtonComponent')).toBe(true);
    expect(hasPlayground('NotAComponent')).toBe(false);
  });

  // 20s, not the 5s default: this is the one test that actually calls a
  // loader, so it pays for the Angular transform of the playground module and
  // everything it pulls in. It measured ~4.1s on a warm run here — inside the
  // default, but only just, which is how a suite acquires a flake.
  test('a loader resolves to a well-formed PlaygroundFile', async () => {
    const pf = await PLAYGROUND_LOADERS['KjButtonComponent']();
    expect(typeof pf.component).toBe('function');
    expect(Array.isArray(pf.controls)).toBe(true);
    expect(typeof pf.snippet).toBe('function');
    expect(pf.state).toBeTypeOf('object');
  }, 20_000);
});
