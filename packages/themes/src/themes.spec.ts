import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, test } from 'vitest';

/**
 * The shared-layer token contract. Every theme MUST define every token in this list.
 * Update this list when §3.2 of the design spec changes.
 */
const REQUIRED_SHARED_TOKENS = [
  // Neutral surfaces
  '--kj-bg-body', '--kj-bg-surface', '--kj-bg-field',
  '--kj-bg-elevated', '--kj-bg-overlay', '--kj-bg-inverse', '--kj-bg-disabled',
  // Intent surfaces
  '--kj-bg-primary', '--kj-bg-primary-subtle',
  '--kj-bg-accent', '--kj-bg-accent-subtle',
  '--kj-bg-info', '--kj-bg-info-subtle',
  '--kj-bg-success', '--kj-bg-success-subtle',
  '--kj-bg-warning', '--kj-bg-warning-subtle',
  '--kj-bg-danger', '--kj-bg-danger-subtle',
  // FG Class A
  '--kj-fg-default', '--kj-fg-muted', '--kj-fg-subtle', '--kj-fg-disabled',
  // FG Class B
  '--kj-fg-on-primary', '--kj-fg-on-accent',
  '--kj-fg-on-info', '--kj-fg-on-success', '--kj-fg-on-warning', '--kj-fg-on-danger',
  '--kj-fg-on-inverse',
  // FG Class C
  '--kj-fg-primary', '--kj-fg-accent',
  '--kj-fg-info', '--kj-fg-success', '--kj-fg-warning', '--kj-fg-danger',
  // Borders
  '--kj-border-default', '--kj-border-muted', '--kj-border-strong',
  '--kj-border-focus', '--kj-border-disabled',
  '--kj-border-primary', '--kj-border-danger',
  // Shadows
  '--kj-shadow-sm', '--kj-shadow-md', '--kj-shadow-lg', '--kj-shadow-focus',
  // shape
  '--kj-radius-box', '--kj-radius-field', '--kj-radius-selector',
  '--kj-border', '--kj-depth',
  // type
  '--kj-font-sans', '--kj-font-mono', '--kj-font-display',
  '--kj-text-xs', '--kj-text-sm', '--kj-text-base', '--kj-text-lg', '--kj-text-xl', '--kj-text-2xl',
  // spacing (semantic)
  '--kj-space-xs', '--kj-space-sm', '--kj-space-md',
  '--kj-space-lg', '--kj-space-xl',
  '--kj-space-2xl', '--kj-space-3xl', '--kj-space-4xl',
  '--kj-space-5xl', '--kj-space-6xl',
  // motion
  '--kj-transition',
] as const;

const themesDir = resolve(import.meta.dirname, 'themes');

function discoverThemes(): { name: string; cssPath: string }[] {
  return readdirSync(themesDir)
    .filter(f => f.endsWith('.css'))
    .map(f => ({ name: f.replace(/\.css$/, ''), cssPath: resolve(themesDir, f) }));
}

function tokensDefinedInThemeBlock(cssText: string, themeName: string): Set<string> {
  const root = postcss.parse(cssText);
  const tokens = new Set<string>();
  root.walkRules(rule => {
    // Match either bare [data-theme="X"] or layered :where([data-theme="X"]).
    if (!rule.selector.includes(`[data-theme="${themeName}"]`)) return;
    rule.walkDecls(decl => {
      if (decl.prop.startsWith('--kj-')) tokens.add(decl.prop);
    });
  });
  return tokens;
}

describe('theme contract', () => {
  const themes = discoverThemes();

  test('at least one theme is present', () => {
    expect(themes.length).toBeGreaterThan(0);
  });

  for (const theme of themes) {
    describe(theme.name, () => {
      const css = readFileSync(theme.cssPath, 'utf-8');
      const defined = tokensDefinedInThemeBlock(css, theme.name);

      for (const token of REQUIRED_SHARED_TOKENS) {
        test(`defines ${token}`, () => {
          expect(defined).toContain(token);
        });
      }
    });
  }
});
