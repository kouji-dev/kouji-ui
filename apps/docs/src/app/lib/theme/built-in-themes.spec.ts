import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatHex, interpolate, parse } from 'culori';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';
import { BUILT_IN_THEMES, BUILT_IN_NAMES } from './built-in-themes';
import { BG_SLOTS, FG_SLOTS, type AnySlot } from './types';

/**
 * The forkable seeds behind the theme generator. They are hand-mirrored from
 * `packages/themes/src/themes/*.css`, so this spec only guards the shape the
 * editor relies on — every editable slot present and parseable. The values
 * themselves are held to WCAG by `theme-a11y-report.spec.ts` (per draft) and
 * by `packages/themes/src/themes.spec.ts` (for the shipped CSS).
 */
describe('BUILT_IN_THEMES', () => {
  test.each(BUILT_IN_NAMES)('contains %s', (name) => {
    expect(BUILT_IN_THEMES[name]).toBeDefined();
    expect(BUILT_IN_THEMES[name].name).toBe(name);
  });

  test.each(BUILT_IN_NAMES)('%s defines every editable colour slot', (name) => {
    const t = BUILT_IN_THEMES[name];
    for (const slot of BG_SLOTS) {
      expect(parse(t.bg[slot]), `${name} ${slot} = ${t.bg[slot]}`).toBeDefined();
    }
    for (const slot of FG_SLOTS) {
      expect(parse(t.fg[slot]), `${name} ${slot} = ${t.fg[slot]}`).toBeDefined();
    }
    expect(Object.keys(t.bg).sort()).toEqual([...BG_SLOTS].sort());
    expect(Object.keys(t.fg).sort()).toEqual([...FG_SLOTS].sort());
  });

  test.each(BUILT_IN_NAMES)('%s defines the non-colour groups the serializer reads', (name) => {
    const t = BUILT_IN_THEMES[name];
    for (const key of ['radiusBox', 'radiusField', 'radiusSelector', 'border', 'depth'] as const) {
      expect(typeof t.shape[key]).toBe('number');
    }
    for (const key of ['fontSans', 'fontMono', 'fontDisplay'] as const) {
      expect(t.type[key]).toBeTruthy();
    }
    expect(t.typography.bodyRem).toBeGreaterThan(0);
    expect(t.typography.smallRem).toBeGreaterThan(0);
    expect(t.motion.transition).toMatch(/\ds/);
  });
});

/**
 * The seeds are a hand-written copy of `packages/themes/src/themes/*.css`, so
 * nothing stops the two drifting — and they had: four seeds (kouji, dark,
 * retro, cyberpunk) still carried a pre-redesign palette, which is how the
 * kouji seed ended up shipping a `fg-on-danger` pair at 3.91:1 that the live
 * theme had already fixed. This resolves each theme's CSS the way the browser
 * would (var() chains through the theme block then base.css `:root`, plus
 * `color-mix()`) and compares the editable slots, so a token edit in
 * @kouji-ui/themes fails here until the mirror is updated.
 */
describe('BUILT_IN_THEMES mirrors the shipped theme CSS', () => {
  const THEMES_SRC = resolve(import.meta.dirname, '../../../../../../packages/themes/src');
  const baseRoot = declsWhere(readFileSync(resolve(THEMES_SRC, 'base.css'), 'utf-8'), (s) => s.includes(':root'));

  function declsWhere(cssText: string, match: (selector: string) => boolean): Map<string, string> {
    const out = new Map<string, string>();
    postcss.parse(cssText).walkRules((rule) => {
      if (!match(rule.selector)) return;
      rule.walkDecls((d) => {
        out.set(d.prop, d.value);
      });
    });
    return out;
  }

  function resolveValue(value: string, tokens: Map<string, string>, depth = 0): string | undefined {
    if (depth > 12) return undefined;
    const v = value.trim();
    const varMatch = /^var\((--[\w-]+)(?:\s*,\s*(.*))?\)$/s.exec(v);
    if (varMatch) {
      const target = tokens.get(varMatch[1]) ?? baseRoot.get(varMatch[1]);
      if (target !== undefined) return resolveValue(target, tokens, depth + 1);
      return varMatch[2] === undefined ? undefined : resolveValue(varMatch[2], tokens, depth + 1);
    }
    const mix = /^color-mix\(in (\w+),\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*(.+)\)$/s.exec(v);
    if (mix) {
      const a = parse(resolveValue(mix[2], tokens, depth + 1) ?? '');
      const b = parse(resolveValue(mix[4], tokens, depth + 1) ?? '');
      if (!a || !b) return undefined;
      return formatHex(interpolate([a, b], mix[1] as 'oklch')(1 - Number(mix[3]) / 100));
    }
    return v;
  }

  const hex = (css: string | undefined) => {
    const c = css ? parse(css) : undefined;
    return c ? formatHex(c) : `unresolved(${css})`;
  };

  test.each(BUILT_IN_NAMES)('%s matches packages/themes/src/themes/%s.css', (name) => {
    const css = readFileSync(resolve(THEMES_SRC, 'themes', `${name}.css`), 'utf-8');
    const tokens = declsWhere(css, (s) => s.includes(`[data-theme="${name}"]`));
    const seed = BUILT_IN_THEMES[name];
    const drift: string[] = [];

    for (const slot of [...BG_SLOTS, ...FG_SLOTS] as AnySlot[]) {
      const raw = tokens.get(`--kj-${slot}`);
      expect(raw, `${name}.css does not declare --kj-${slot}`).toBeDefined();
      const shipped = hex(resolveValue(raw!, tokens));
      const mirrored = hex(slot.startsWith('bg-') ? seed.bg[slot as never] : seed.fg[slot as never]);
      if (shipped !== mirrored) drift.push(`${slot}: css ${shipped} vs seed ${mirrored}`);
    }

    expect(drift).toEqual([]);
  });
});
