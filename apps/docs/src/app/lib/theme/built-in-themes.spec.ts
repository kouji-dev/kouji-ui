import { BUILT_IN_THEMES, BUILT_IN_NAMES } from './built-in-themes';

describe('BUILT_IN_THEMES', () => {
  test.each(BUILT_IN_NAMES)('contains %s', (name) => {
    expect(BUILT_IN_THEMES[name]).toBeDefined();
    expect(BUILT_IN_THEMES[name].name).toBe(name);
  });

  test.each(BUILT_IN_NAMES)('%s defines all 9 color slots', (name) => {
    const t = BUILT_IN_THEMES[name];
    for (const slot of ['base-100','primary','secondary','accent','neutral','info','success','warning','destructive'] as const) {
      expect(t.colors[slot]).toMatch(/^oklch\(/);
    }
  });
});
