import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

/**
 * Every `var(--kj-…)` chain in the overlay-family stylesheets must end in a
 * token some registered stylesheet declares, or in a literal.
 *
 * A chain whose innermost fallback is an undeclared custom property computes
 * to the guaranteed-invalid value, and the whole declaration is dropped at
 * computed-value time. That is how two `:focus-visible` rules shipped with no
 * focus ring at all: `outline: var(--kj-focus-ring-width, 2px) solid
 * var(--kj-focus-ring-color, var(--kj-primary))` — none of the three tokens
 * declared anywhere — collapsed to `outline-style: none` and, being an author
 * declaration, suppressed the UA ring too (WCAG 2.4.7 Focus Visible).
 */

const HERE = import.meta.dirname;
const AGGREGATOR = resolve(HERE, 'overlay.css');
const COMPONENTS_SRC = resolve(HERE, '..');
const CORE_SRC = resolve(HERE, '..', '..', '..', 'core', 'src');
const THEMES_SRC = resolve(HERE, '..', '..', '..', 'themes', 'src');
const CORE_OVERLAY_CSS = resolve(CORE_SRC, 'primitives', 'overlay', 'overlay.css');

/**
 * Custom properties a directive sets from a host style binding
 * (`'[style.--kj-toast-index]': 'index()'`). They never appear in a
 * stylesheet, yet every element the rule can match carries them.
 */
function runtimeTokens(srcDirs: string[]): Set<string> {
  const out = new Set<string>();
  for (const dir of srcDirs) {
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts'))
        continue;
      const source = readFileSync(resolve(entry.parentPath, entry.name), 'utf-8');
      for (const m of source.matchAll(/\[style\.(--kj-[a-z0-9-]+)\]/g)) out.add(m[1]);
    }
  }
  return out;
}

/** Absolute paths of every stylesheet reachable from `file` through `@import`. */
function importGraph(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file)) return [];
  seen.add(file);
  const css = readFileSync(file, 'utf-8');
  const children = [...css.matchAll(/@import\s+"([^"]+)";/g)].map((m) =>
    resolve(dirname(file), m[1]),
  );
  return [file, ...children.flatMap((child) => importGraph(child, seen))];
}

/** Custom properties declared anywhere in `files` — theme blocks, `:root` and component rules alike. */
function declaredTokens(files: string[]): Set<string> {
  const out = new Set<string>();
  for (const file of files) {
    postcss.parse(readFileSync(file, 'utf-8')).walkDecls((d) => {
      if (d.prop.startsWith('--')) out.add(d.prop);
    });
  }
  return out;
}

interface VarRef {
  name: string;
  fallback: string | undefined;
}

function topLevelComma(s: string): number {
  let depth = 0;
  for (let k = 0; k < s.length; k++) {
    if (s[k] === '(') depth++;
    else if (s[k] === ')') depth--;
    else if (s[k] === ',' && depth === 0) return k;
  }
  return -1;
}

/** Every top-level `var()` call in `value`, with its raw fallback text (nested chains included). */
function varRefs(value: string): VarRef[] {
  const refs: VarRef[] = [];
  let i = value.indexOf('var(');
  while (i !== -1) {
    let depth = 0;
    let j = i + 3;
    for (; j < value.length; j++) {
      if (value[j] === '(') depth++;
      else if (value[j] === ')' && --depth === 0) break;
    }
    const args = value.slice(i + 4, j);
    const comma = topLevelComma(args);
    refs.push({
      name: (comma === -1 ? args : args.slice(0, comma)).trim(),
      fallback: comma === -1 ? undefined : args.slice(comma + 1).trim(),
    });
    i = value.indexOf('var(', j);
  }
  return refs;
}

/** True when the chain can never hit the guaranteed-invalid value. */
function resolves(ref: VarRef, declared: Set<string>): boolean {
  if (declared.has(ref.name)) return true;
  if (ref.fallback === undefined) return false;
  // A literal fallback always resolves; a var() fallback must itself resolve.
  return varRefs(ref.fallback).every((inner) => resolves(inner, declared));
}

describe('overlay-family token chains', () => {
  const files = importGraph(AGGREGATOR);
  const declared = new Set([
    ...declaredTokens([
      resolve(THEMES_SRC, 'base.css'),
      resolve(THEMES_SRC, 'density.css'),
      ...readdirSync(resolve(THEMES_SRC, 'themes'))
        .filter((f) => f.endsWith('.css'))
        .map((f) => resolve(THEMES_SRC, 'themes', f)),
      CORE_OVERLAY_CSS,
      ...files,
    ]),
    ...runtimeTokens([CORE_SRC, COMPONENTS_SRC]),
  ]);

  it('the shared focus token the fix relies on is a theme contract', () => {
    expect(declared.has('--kj-border-focus')).toBe(true);
  });

  it('every var() chain ends in a declared token or a literal', () => {
    const dangling: string[] = [];
    for (const file of files) {
      postcss.parse(readFileSync(file, 'utf-8')).walkDecls((d) => {
        for (const ref of varRefs(d.value)) {
          if (resolves(ref, declared)) continue;
          const selector = d.parent?.type === 'rule' ? (d.parent as Rule).selector : '?';
          dangling.push(`${basename(file)} · ${selector} { ${d.prop}: ${d.value} }`);
        }
      });
    }
    expect(dangling, 'chains that resolve to nothing').toEqual([]);
  });

  it('the sheet handle and the action-sheet rows paint a focus ring from the shared token', () => {
    const rings: Record<string, string> = {};
    for (const file of files) {
      postcss.parse(readFileSync(file, 'utf-8')).walkRules((rule) => {
        for (const sel of rule.selector.split(',').map((s) => s.trim())) {
          if (!sel.endsWith(':focus-visible')) continue;
          rule.walkDecls('outline', (d) => {
            rings[sel] = d.value;
          });
        }
      });
    }
    for (const sel of [
      '.kj-sheet__handle:focus-visible',
      '.kj-action-sheet__item:focus-visible',
      '.kj-action-sheet__cancel:focus-visible',
    ]) {
      expect(rings[sel], `${sel} declares an outline`).toBeDefined();
      expect(rings[sel]).not.toMatch(/^(none|0)\b/);
      expect(rings[sel]).toContain('var(--kj-border-focus)');
    }
  });
});
