import { describe, expect, test } from 'vitest';
import { deriveFromSeed, randomAccessiblePalette } from './palette-derive';
import { SEED_SWATCHES } from './seed-swatches';

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

describe('randomAccessiblePalette', () => {
  test('returns a 9-slot palette', () => {
    const out = randomAccessiblePalette({ random: () => 0.5 });
    expect(Object.keys(out)).toHaveLength(9);
  });

  test('is deterministic given a fixed RNG', () => {
    const a = randomAccessiblePalette({ random: () => 0.3 });
    const b = randomAccessiblePalette({ random: () => 0.3 });
    expect(a).toEqual(b);
  });

  test('uses a curated swatch as primary', () => {
    const out = randomAccessiblePalette({ random: () => 0 });
    const hexes = SEED_SWATCHES.map(s => s.hex.toLowerCase());
    expect(hexes).toContain(out.primary.toLowerCase());
  });

  test('default RNG works (smoke)', () => {
    const out = randomAccessiblePalette();
    expect(Object.keys(out)).toHaveLength(9);
    expect(out.primary).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
