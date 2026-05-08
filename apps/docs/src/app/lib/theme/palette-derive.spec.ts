import { describe, expect, test } from 'vitest';
import { deriveFromSeed } from './palette-derive';

describe('deriveFromSeed', () => {
  test('returns all 9 color slots', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(Object.keys(out).sort()).toEqual([
      'accent', 'base-100', 'destructive', 'info',
      'neutral', 'primary', 'secondary', 'success', 'warning',
    ]);
  });

  test('primary equals seed', () => {
    expect(deriveFromSeed('#3366cc', { mode: 'light' }).primary.toLowerCase()).toBe('#3366cc');
  });

  test('light mode produces a near-white base-100', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(out['base-100']).toMatch(/^#f/i);
  });

  test('dark mode produces a near-black base-100', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'dark' });
    expect(out['base-100']).toMatch(/^#[0-2]/i);
  });

  test('triadic harmony shifts accent', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light', harmony: 'triadic' });
    expect(out.accent.toLowerCase()).not.toBe('#3366cc');
  });

  test('semantic colors are valid hex', () => {
    const out = deriveFromSeed('#3366cc', { mode: 'light' });
    for (const key of ['info','success','warning','destructive'] as const) {
      expect(out[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('is deterministic', () => {
    const a = deriveFromSeed('#3366cc', { mode: 'light' });
    const b = deriveFromSeed('#3366cc', { mode: 'light' });
    expect(a).toEqual(b);
  });
});
