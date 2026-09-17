import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'sheet.css'), 'utf-8');

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

describe('sheet grab handle focus ring', () => {
  // The handle is the keyboard affordance for dismissing / resizing the sheet.
  // Its ring used to read `var(--kj-focus-ring-color, var(--kj-primary))` —
  // neither token exists, so the outline computed to `none` and a keyboard
  // user had nothing to track (WCAG 2.4.7 Focus Visible).
  const ring = decls('.kj-sheet__handle:focus-visible');

  test('paints a ring from the shared focus token every theme declares', () => {
    expect(ring['outline']).toBe('2px solid var(--kj-border-focus)');
    expect(ring['outline-offset']).toBeDefined();
  });

  test('its corner radius reads a shipped shape token', () => {
    // `--kj-radius-sm` exists only in the docs-site stylesheet; the published
    // themes ship `--kj-radius-field` / `--kj-radius-box`.
    expect(ring['border-radius']).toBe('var(--kj-radius-field)');
  });

  test('no declaration reaches for a token the themes never declare', () => {
    expect(css).not.toMatch(/--kj-focus-ring-|--kj-primary\b|--kj-radius-sm\b/);
  });
});
