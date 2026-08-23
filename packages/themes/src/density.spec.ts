import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'density.css'), 'utf-8');
const baseCss = readFileSync(resolve(import.meta.dirname, 'base.css'), 'utf-8');
const indexCss = readFileSync(resolve(import.meta.dirname, 'index.css'), 'utf-8');

/** Custom properties registered via `@property` in density.css. */
function registeredProps(text: string): Set<string> {
  const out = new Set<string>();
  postcss.parse(text).walkAtRules('property', rule => out.add(rule.params.trim()));
  return out;
}

/** Declarations inside a rule whose selector matches `selector`. */
function declsFor(text: string, selector: string): Map<string, string> {
  const out = new Map<string, string>();
  postcss.parse(text).walkRules(rule => {
    if (!rule.selector.includes(selector)) return;
    rule.walkDecls(decl => out.set(decl.prop, decl.value));
  });
  return out;
}

describe('density layer', () => {
  test('is exported from the package entry', () => {
    expect(indexCss).toContain("@import './density.css';");
  });

  test('joins the existing kj.base layer without redeclaring layer order', () => {
    // Editing the `@layer kj.reset, kj.base, kj.shared, kj.component` statement
    // desyncs consumers who re-declare it, so density.css must not carry one.
    expect(css).toMatch(/@layer\s+kj\.base\s*\{/);
    expect(css).not.toMatch(/@layer\s+[\w.]+\s*,/);
    expect(baseCss).toMatch(/@layer kj\.reset, kj\.base, kj\.shared, kj\.component;/);
  });

  describe('@property registration', () => {
    const registered = registeredProps(css);

    test('registers the two scalars', () => {
      expect(registered).toContain('--kj-density');
      expect(registered).toContain('--kj-type-scale');
    });

    test('registers the height ladder that JS reads', () => {
      for (const t of ['xs', 'sm', 'md', 'lg', 'xl']) {
        expect(registered).toContain(`--kj-ctl-h-${t}`);
      }
      expect(registered).toContain('--kj-row-h');
    });

    test('does NOT register the pre-existing space/text tokens', () => {
      // Registering them would make invalid-at-computed-value-time APPLY,
      // silently discarding a legitimate consumer override such as
      // `--kj-space-md: 0`. That is a breaking change, so it must not happen.
      for (const prop of registered) {
        expect(prop, `${prop} must not be registered`).not.toMatch(
          /^--kj-(space|text)-/,
        );
      }
    });
  });

  describe('scale', () => {
    const root = declsFor(css, ':root');

    test('every t-shirt spacing name re-points at the numeric ladder', () => {
      const expected: Record<string, string> = {
        '--kj-space-xs': 'var(--kj-space-2)',
        '--kj-space-sm': 'var(--kj-space-4)',
        '--kj-space-md': 'var(--kj-space-6)',
        '--kj-space-lg': 'var(--kj-space-7)',
        '--kj-space-xl': 'var(--kj-space-9)',
        '--kj-space-2xl': 'var(--kj-space-11)',
      };
      for (const [name, target] of Object.entries(expected)) {
        expect(root.get(name), `${name} must re-point at ${target}`).toBe(target);
      }
    });

    test('the numeric ladder and heights derive from --kj-density', () => {
      for (const n of [1, 4, 7, 11]) {
        expect(root.get(`--kj-space-${n}`)).toMatch(
          /round\(calc\(.*var\(--kj-density\).*\),\s*1px\)/,
        );
      }
      for (const t of ['xs', 'sm', 'md', 'lg', 'xl']) {
        expect(root.get(`--kj-ctl-h-${t}`)).toMatch(
          /round\(calc\(.*var\(--kj-density\).*\),\s*1px\)/,
        );
      }
    });

    test('the type ramp derives from --kj-type-scale, snapped to a half px', () => {
      for (const t of ['3xs', '2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl']) {
        expect(root.get(`--kj-text-${t}`)).toMatch(
          /round\(calc\(.*var\(--kj-type-scale\).*\),\s*0\.5px\)/,
        );
      }
    });

    test('exposes code metrics for editor and terminal surfaces', () => {
      expect(root.get('--kj-text-code')).toBeDefined();
      expect(root.get('--kj-leading-code')).toBeDefined();
    });
  });

  describe('presets', () => {
    test('all three KjTableDensity values remain valid selectors', () => {
      // Renaming or dropping one would break the existing table API.
      for (const level of ['compact', 'standard', 'comfortable']) {
        expect(css).toContain(`[data-density="${level}"]`);
      }
    });

    test('standard is an explicit no-op', () => {
      const standard = declsFor(css, '[data-density="standard"]');
      expect(standard.get('--kj-density')).toBe('1');
      expect(standard.get('--kj-type-scale')).toBe('1');
    });

    test('comfy is accepted as an alias of comfortable', () => {
      expect(css).toMatch(/\[data-density="comfortable"\],\s*\[data-density="comfy"\]/);
    });

    test('type breathes more gently than boxes at both ends', () => {
      const compact = declsFor(css, '[data-density="compact"]');
      const comfortable = declsFor(css, '[data-density="comfortable"]');

      const cDensity = Number(compact.get('--kj-density'));
      const cType = Number(compact.get('--kj-type-scale'));
      const fDensity = Number(comfortable.get('--kj-density'));
      const fType = Number(comfortable.get('--kj-type-scale'));

      // An 0.85 squeeze that flatters padding is punishing on 12px text, so the
      // type scalar must always sit closer to 1 than the box scalar.
      expect(1 - cType).toBeLessThan(1 - cDensity);
      expect(fType - 1).toBeLessThan(fDensity - 1);
    });
  });
});
