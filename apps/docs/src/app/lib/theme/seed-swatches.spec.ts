import { describe, expect, test } from 'vitest';
import { converter } from 'culori';
import { SEED_SWATCHES, HUE_FAMILIES } from './seed-swatches';

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

describe('SEED_SWATCHES', () => {
  test('contains at least 30 swatches', () => {
    expect(SEED_SWATCHES.length).toBeGreaterThanOrEqual(30);
  });

  test('every entry has hex, name, hueFamily, lightBase', () => {
    for (const s of SEED_SWATCHES) {
      expect(s.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(s.name).toBeTruthy();
      expect(HUE_FAMILIES).toContain(s.hueFamily);
      expect(s.lightBase).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('every hue family has at least one swatch', () => {
    for (const fam of HUE_FAMILIES) {
      expect(
        SEED_SWATCHES.some((s) => s.hueFamily === fam),
        `family ${fam} has no swatch`,
      ).toBe(true);
    }
  });

  test('every swatch passes WCAG AAA (>= 7:1) on its lightBase', () => {
    for (const s of SEED_SWATCHES) {
      const r = ratio(s.hex, s.lightBase);
      expect(r, `${s.name} ${s.hex} on ${s.lightBase}`).toBeGreaterThanOrEqual(7);
    }
  });
});
