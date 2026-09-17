import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'toast.css'), 'utf8');

function ruleBody(selector: string): string {
  const idx = css.indexOf(selector);
  expect(idx, `${selector} rule present`).toBeGreaterThan(-1);
  return css.slice(css.indexOf('{', idx) + 1, css.indexOf('}', idx));
}

describe('toast.css', () => {
  it('the viewport takes the overlay stack level when it lives inside an overlay, else the toast layer', () => {
    const body = ruleBody('.kj-toast-viewport {');
    expect(body).toMatch(/z-index:\s*var\(--kj-overlay-z,\s*var\(--kj-toast-z-index,\s*2000\)\)/);
  });

  it('declares no other fixed z-index that could escape the overlay stack', () => {
    const zIndexes = css.match(/z-index:[^;]+;/g) ?? [];
    expect(zIndexes).toHaveLength(1);
  });
});
