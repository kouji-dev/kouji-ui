import { describe, expect, test } from 'vitest';
import { converter } from 'culori';
import { hueShift, analogous, complementary, triadic } from './harmonies';

const toOklch = converter('oklch');

function hue(hex: string): number { return toOklch(hex)?.h ?? 0; }
function lightness(hex: string): number { return toOklch(hex)?.l ?? 0; }
function chroma(hex: string): number { return toOklch(hex)?.c ?? 0; }

function hueDelta(a: string, b: string): number {
  const d = ((hue(b) - hue(a)) % 360 + 540) % 360 - 180;
  return Math.abs(d);
}

describe('harmonies', () => {
  const SEED = '#3366cc';

  test('hueShift(0) is identity', () => {
    expect(hueShift(SEED, 0).toLowerCase()).toBe(SEED);
  });

  test('hueShift(60) rotates hue by ~60 degrees', () => {
    const out = hueShift(SEED, 60);
    expect(hueDelta(SEED, out)).toBeCloseTo(60, 0);
  });

  test('hueShift preserves lightness and chroma within tolerance', () => {
    const out = hueShift(SEED, 120);
    expect(lightness(out)).toBeCloseTo(lightness(SEED), 2);
    expect(chroma(out)).toBeCloseTo(chroma(SEED), 2);
  });

  test('analogous shifts hue by ~30 degrees', () => {
    expect(hueDelta(SEED, analogous(SEED))).toBeCloseTo(30, 0);
  });

  test('complementary shifts hue by ~180 degrees', () => {
    expect(hueDelta(SEED, complementary(SEED))).toBeCloseTo(180, -2);
  });

  test('triadic shifts hue by ~120 degrees', () => {
    expect(hueDelta(SEED, triadic(SEED))).toBeCloseTo(120, 0);
  });

  test('hueShift handles large negative degrees', () => {
    const a = hueShift(SEED, -720);
    expect(a.toLowerCase()).toBe(SEED);
  });
});
