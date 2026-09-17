import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'select.css'), 'utf8');

describe('select.css', () => {
  it('gives a focused option a visible focus ring (roving focus lands on options)', () => {
    const idx = css.indexOf('.kj-option:focus-visible');
    expect(idx).toBeGreaterThan(-1);
    const body = css.slice(css.indexOf('{', idx) + 1, css.indexOf('}', idx));
    expect(body).toMatch(/outline:\s*2px solid var\(--kj-fg-primary\)/);
  });
});
