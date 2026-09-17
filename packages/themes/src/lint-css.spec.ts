import { resolve } from 'node:path';
import stylelint from 'stylelint';
import { describe, expect, test } from 'vitest';

/**
 * The three stylelint rules in tools/stylelint/index.mjs — `kouji/layered`,
 * `kouji/known-tokens` and `kouji/namespaced` — exercised on fixtures, then
 * the real `stylelint.config.mjs` run over every library stylesheet (what
 * `pnpm lint:css` does), so CI fails the moment a sheet ships unlayered, a
 * `var(--kj-…)` chain stops resolving, or a selector escapes the `.kj-`
 * namespace.
 */

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const PLUGIN = resolve(REPO, 'tools', 'stylelint', 'index.mjs');

async function lint(code: string, rules: Record<string, unknown>, file = 'packages/components/src/x/x.css') {
  const result = await stylelint.lint({
    code,
    codeFilename: resolve(REPO, file),
    config: { plugins: [PLUGIN], rules },
  });
  return result.results[0].warnings.map((w) => `${w.rule}: ${w.text}`);
}

describe('kouji/layered', () => {
  const rules = { 'kouji/layered': true };

  test('accepts a sheet whose rules sit inside @layer kj.component', async () => {
    expect(await lint('@layer kj.component { .kj-x { color: red; } }', rules)).toEqual([]);
  });

  test('rejects a rule outside any layer', async () => {
    const out = await lint('.kj-x { color: red; }', rules);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/kouji\/layered: Rule "\.kj-x" is outside a @layer block/);
  });

  test('rejects a layer name layers.css does not pin', async () => {
    const out = await lint('@layer kj.mystery { .kj-x { color: red; } }', rules);
    expect(out.some((w) => /Layer "kj\.mystery" is not pinned/.test(w))).toBe(true);
  });

  test('keyframe steps outside a layer are fine (they are not cascade rules)', async () => {
    const css = '@layer kj.component { .kj-x { animation: kj-x 1s; } } @keyframes kj-x { to { opacity: 1; } }';
    expect(await lint(css, rules)).toEqual([]);
  });
});

describe('kouji/known-tokens', () => {
  const tokens = ['--kj-bg-body', '--kj-fg-default'];
  const rules = { 'kouji/known-tokens': [true, { tokens }] };

  test('accepts a declared theme token and a chain that ends in a literal', async () => {
    const css = '@layer kj.component { .kj-x { color: var(--kj-fg-default); outline: var(--kj-nope, var(--kj-nope-2, 2px)) solid; } }';
    expect(await lint(css, rules)).toEqual([]);
  });

  test('rejects a bare undeclared token and a chain whose innermost fallback is undeclared', async () => {
    const css = '@layer kj.component { .kj-x { outline: var(--kj-focus-ring-width, 2px) solid var(--kj-focus-ring-color, var(--kj-primary)); } }';
    const out = await lint(css, rules);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/kouji\/known-tokens: "var\(--kj-focus-ring-color, var\(--kj-primary\)\)" never resolves: --kj- token "--kj-primary"/);
  });

  test('a knob the same sheet declares counts as declared', async () => {
    const css = '@layer kj.component { .kj-x { --kj-x-bg: var(--kj-bg-body); background: var(--kj-x-bg); } }';
    expect(await lint(css, rules)).toEqual([]);
  });

  test('ignores non --kj- names (consumer-owned custom properties)', async () => {
    expect(await lint('@layer kj.component { .kj-x { color: var(--brand); } }', rules)).toEqual([]);
  });

  test('tokens a directive sets from a host style binding count when the manifest is not overridden', async () => {
    // `[style.--kj-toast-index]` in packages/core/src/toast/toast.ts
    const css = '@layer kj.component { .kj-x { order: var(--kj-toast-index); } }';
    expect(await lint(css, { 'kouji/known-tokens': true })).toEqual([]);
  });
});

/**
 * arch F-5's remaining half. `ViewEncapsulation.None` is the permanent
 * architecture (`rules/code_style.md`), so a component stylesheet is a GLOBAL
 * stylesheet in the consumer's document and the `.kj-` namespace is the only
 * thing standing between it and their markup. `kouji/layered` fixes the
 * cascade position; this fixes the reach.
 */
describe('kouji/namespaced', () => {
  const rules = { 'kouji/namespaced': true };

  test('a bare element or class selector is rejected', async () => {
    const bare = await lint('@layer kj.component { .card { color: red; } }', rules);
    expect(bare).toHaveLength(1);
    expect(bare[0]).toMatch(/not anchored by a kouji identifier/);
    expect(await lint('@layer kj.component { button { color: red; } }', rules)).toHaveLength(1);
    // Each selector in a list is judged on its own.
    const list = await lint('@layer kj.component { .kj-x, .card { color: red; } }', rules);
    expect(list).toHaveLength(1);
  });

  test('every anchoring shape the library actually uses is accepted', async () => {
    const ok = [
      '.kj-card { color: red; }',
      '.kj-prose h2 { color: red; }',
      'kj-field.kj-field { color: red; }',
      '[dir="rtl"] .kj-chat { color: red; }',
      '[data-theme="dark"] { color: red; }',
      ':root { --kj-x: 1px; }',
      ':host([data-density="compact"]) th { color: red; }',
      '.kj-dialog::backdrop { color: red; }',
    ];
    for (const selector of ok) {
      expect(await lint(`@layer kj.component { ${selector} }`, rules), selector).toEqual([]);
    }
  });

  test('keyframe steps are not selectors', async () => {
    const css = '@keyframes kj-spin { from { opacity: 0; } 50% { opacity: 1; } to { opacity: 0; } }';
    expect(await lint(css, rules)).toEqual([]);
  });
});

describe('pnpm lint:css over the library', () => {
  test('every stylesheet under packages/*/src passes all three rules', async () => {
    const result = await stylelint.lint({
      files: 'packages/*/src/**/*.css',
      cwd: REPO,
      configFile: resolve(REPO, 'stylelint.config.mjs'),
    });
    const problems = result.results
      .filter((r) => r.warnings.length > 0)
      .map((r) => `${r.source}: ${r.warnings.map((w) => w.text).join(' | ')}`);
    expect(problems).toEqual([]);
    expect(result.results.length).toBeGreaterThan(80);
  }, 30_000);
});
