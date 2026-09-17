import { describe, expect, test } from 'vitest';
import { DraftThemeSchema } from './import-schema';
import { BUILT_IN_THEMES } from './built-in-themes';
import { BG_SLOTS, FG_SLOTS } from './types';

type Loose = { name: string; bg: Record<string, unknown>; fg: Record<string, unknown> };
const clone = () => structuredClone(BUILT_IN_THEMES.light) as unknown as Loose;

describe('DraftThemeSchema', () => {
  test('accepts every built-in theme', () => {
    for (const t of Object.values(BUILT_IN_THEMES)) {
      expect(() => DraftThemeSchema.parse(t)).not.toThrow();
    }
  });

  test.each(BG_SLOTS)('rejects a draft missing %s', (slot) => {
    const broken = clone();
    delete broken.bg[slot];
    expect(() => DraftThemeSchema.parse(broken)).toThrow();
  });

  test.each(FG_SLOTS)('rejects a draft missing %s', (slot) => {
    const broken = clone();
    delete broken.fg[slot];
    expect(() => DraftThemeSchema.parse(broken)).toThrow();
  });

  test('rejects name > 32 chars', () => {
    const broken = clone();
    broken.name = 'x'.repeat(33);
    expect(() => DraftThemeSchema.parse(broken)).toThrow();
  });
});
