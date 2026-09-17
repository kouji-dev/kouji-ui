import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'cascade-select.css'), 'utf8');

/** Body of the first rule whose selector list contains `selector`. */
function ruleBody(selector: string): string {
  const idx = css.indexOf(selector);
  expect(idx, `${selector} rule`).toBeGreaterThan(-1);
  return css.slice(css.indexOf('{', idx) + 1, css.indexOf('}', idx));
}

describe('cascade-select.css', () => {
  it('stacks the sub-panel one level above the root panel it belongs to, from the overlay stack variable', () => {
    expect(ruleBody('.kj-cascade-sub-panel {')).toMatch(/z-index:\s*calc\(var\(--kj-overlay-z,\s*1000\)\s*\+\s*1\)/);
    expect(css).not.toMatch(/z-index:\s*1001;/);
  });

  it('gives a focused option a visible focus ring (roving focus lands on options)', () => {
    expect(ruleBody('.kj-cascade-option:focus-visible')).toMatch(/outline:\s*2px solid var\(--kj-border-focus\)/);
  });
});
