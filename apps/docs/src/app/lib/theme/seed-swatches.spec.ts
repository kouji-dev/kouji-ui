import { describe, expect, test } from 'vitest';
import { converter } from 'culori';
import {
  buildSeedSwatchMatrix,
  flattenSeedSwatchMatrix,
  HUE_FAMILIES,
  resolveSeedSwatchMatrixToHex,
  SEED_SHADE_COUNT,
  SEED_SWATCHES,
  seedSwatchesForAccessiblePrimary,
} from './seed-swatches';

const toRgb = converter('rgb');

function relLum(hex: string): number {
  const c = toRgb(hex)!;
  const lin = (x: number) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function ratio(a: string, b: string): number {
  const la = relLum(a);
  const lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT_BASE = '#ffffff';

describe('buildSeedSwatchMatrix', () => {
  test('returns OKLCH specs only — no hex strings', () => {
    const m = buildSeedSwatchMatrix();
    expect(m).toHaveLength(HUE_FAMILIES.length);
    for (const col of m) {
      expect(col.shades).toHaveLength(SEED_SHADE_COUNT);
      for (const s of col.shades) {
        expect(s.l).toBeGreaterThanOrEqual(0);
        expect(s.l).toBeLessThanOrEqual(1);
        expect(s.c).toBeGreaterThanOrEqual(0);
        expect(s.h).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('each hue ramp is light to dark by index (L non-increasing)', () => {
    for (const col of buildSeedSwatchMatrix()) {
      for (let i = 0; i < col.shades.length - 1; i++) {
        expect(col.shades[i].l).toBeGreaterThanOrEqual(col.shades[i + 1].l);
      }
    }
  });
});

describe('resolveSeedSwatchMatrixToHex', () => {
  test('produces valid hex swatches', () => {
    const resolved = resolveSeedSwatchMatrixToHex(buildSeedSwatchMatrix());
    expect(resolved).toHaveLength(HUE_FAMILIES.length);
    for (const col of resolved) {
      expect(col.shades).toHaveLength(SEED_SHADE_COUNT);
      for (const hex of col.shades) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('SEED_SWATCHES', () => {
  test('flattened matrix size', () => {
    expect(SEED_SWATCHES.length).toBe(HUE_FAMILIES.length * SEED_SHADE_COUNT);
    expect(flattenSeedSwatchMatrix().length).toBe(SEED_SWATCHES.length);
  });

  test('every entry has hex and hueFamily', () => {
    for (const s of SEED_SWATCHES) {
      expect(s.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(HUE_FAMILIES).toContain(s.hueFamily);
    }
  });

  test('accessible-primary subset is non-empty and passes AAA on white', () => {
    const acc = seedSwatchesForAccessiblePrimary();
    expect(acc.length).toBeGreaterThan(0);
    for (const s of acc) {
      expect(ratio(s.hex, LIGHT_BASE)).toBeGreaterThanOrEqual(7);
    }
  });
});
