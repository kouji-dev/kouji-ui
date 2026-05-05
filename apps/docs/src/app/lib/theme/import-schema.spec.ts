import { DraftThemeSchema } from './import-schema';
import { BUILT_IN_THEMES } from './built-in-themes';

describe('DraftThemeSchema', () => {
  test('accepts every built-in theme', () => {
    for (const t of Object.values(BUILT_IN_THEMES)) {
      expect(() => DraftThemeSchema.parse(t)).not.toThrow();
    }
  });

  test('rejects missing color slot', () => {
    const broken = structuredClone(BUILT_IN_THEMES.light) as Record<string, unknown> & { colors: Record<string, unknown>; name: string };
    delete broken.colors.primary;
    expect(() => DraftThemeSchema.parse(broken)).toThrow();
  });

  test('rejects name > 32 chars', () => {
    const broken = structuredClone(BUILT_IN_THEMES.light) as Record<string, unknown> & { colors: Record<string, unknown>; name: string };
    broken.name = 'x'.repeat(33);
    expect(() => DraftThemeSchema.parse(broken)).toThrow();
  });
});
