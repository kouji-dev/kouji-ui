import { describe, expect, test } from 'vitest';
import { shortContrastPairLabel } from './edge-pair-label';

describe('shortContrastPairLabel', () => {
  test('primary row: primary on base-100 → base-100', () => {
    expect(
      shortContrastPairLabel('primary', { fgToken: 'primary', bgToken: 'base-100' }),
    ).toBe('base-100');
  });

  test('primary row: primary-content on primary → primary-content', () => {
    expect(
      shortContrastPairLabel('primary', { fgToken: 'primary-content', bgToken: 'primary' }),
    ).toBe('primary-content');
  });

  test('base-100 row: primary on base-100 → primary', () => {
    expect(
      shortContrastPairLabel('base-100', { fgToken: 'primary', bgToken: 'base-100' }),
    ).toBe('primary');
  });

  test('falls back to fg→bg when neither side is the row slot', () => {
    expect(
      shortContrastPairLabel('accent', { fgToken: 'foo', bgToken: 'bar' }),
    ).toBe('foo→bar');
  });

  test('base-200 row: base-content on base-200 → base-content', () => {
    expect(
      shortContrastPairLabel('base-200', { fgToken: 'base-content', bgToken: 'base-200' }),
    ).toBe('base-content');
  });
});
