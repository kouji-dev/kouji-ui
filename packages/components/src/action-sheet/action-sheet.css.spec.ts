import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'action-sheet.css'), 'utf-8');

/** Declarations of every rule whose selector list contains `selector` verbatim. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selector.split(',').some((s) => s.trim() === selector)) return;
    rule.walkDecls((d) => {
      out[d.prop] = d.value;
    });
  });
  return out;
}

describe('action-sheet focus rings', () => {
  // The action rows are the sheet's primary menu and the cancel row its escape
  // route. Their ring used to read `var(--kj-focus-ring-color, var(--kj-primary))`
  // — neither token exists, so the outline computed to `none` and the
  // documented Tab / Shift+Tab cycle had no visible focus (WCAG 2.4.7).
  test.each(['.kj-action-sheet__item:focus-visible', '.kj-action-sheet__cancel:focus-visible'])(
    '%s paints a ring from the shared focus token every theme declares',
    (selector) => {
      const ring = decls(selector);
      expect(ring['outline']).toBe('2px solid var(--kj-border-focus)');
      expect(ring['outline-offset']).toBeDefined();
    },
  );

  test('no declaration reaches for a token the themes never declare', () => {
    expect(css).not.toMatch(/--kj-focus-ring-|--kj-primary\b/);
  });
});
