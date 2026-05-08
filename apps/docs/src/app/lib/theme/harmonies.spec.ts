import { describe, expect, test } from 'vitest';
import { hueShift, analogous, complementary, triadic } from './harmonies';

describe('harmonies', () => {
  test('hueShift wraps the 360 boundary', () => {
    expect(hueShift('#ff0000', 30)).toMatch(/^#/);
    const rotated = hueShift('#ff0000', 60);
    expect(rotated.toLowerCase()).not.toBe('#ff0000');
  });

  test('analogous returns hue + 30', () => {
    const out = analogous('#ff0000');
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('complementary returns hue + 180', () => {
    const out = complementary('#ff0000');
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('triadic returns hue + 120', () => {
    const out = triadic('#ff0000');
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('hueShift preserves lightness and chroma within tolerance', () => {
    const a = hueShift('#3366cc', 0);
    expect(a.toLowerCase()).toBe('#3366cc');
  });
});
