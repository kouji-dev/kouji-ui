import postcss from 'postcss';
import { describe, expect, test } from 'vitest';
import { serializeToScopedBlock } from './serialize-theme';
import { deriveTokens } from './derive-tokens';
import type { DraftTheme } from './types';

const DRAFT: DraftTheme = {
  name: 'my-theme',
  bg: {
    'bg-body': 'oklch(98% 0.002 247)', 'bg-surface': 'oklch(96% 0.002 247)',
    'bg-field': 'oklch(94% 0.002 247)', 'bg-elevated': 'oklch(100% 0 0)',
    'bg-primary': 'oklch(57% 0.24 27)', 'bg-accent': 'oklch(60% 0.12 184)',
    'bg-info': 'oklch(54% 0.24 262)', 'bg-success': 'oklch(64% 0.2 131)',
    'bg-warning': 'oklch(66% 0.18 58)', 'bg-danger': 'oklch(57% 0.24 27)',
  },
  fg: {
    'fg-default': 'oklch(20% 0.01 247)',
    'fg-on-primary': '#ffffff', 'fg-on-accent': '#ffffff', 'fg-on-info': '#ffffff',
    'fg-on-success': '#ffffff', 'fg-on-warning': '#111111', 'fg-on-danger': '#ffffff',
  },
  shape:  { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
  type:   { fontSans: 'Inter, system-ui', fontMono: 'JetBrains Mono', fontDisplay: 'Syne' },
  typography: { bodyRem: 1, smallRem: 0.875 },
  motion: { transition: '0.2s ease' },
};

/**
 * Mirrors REQUIRED_SHARED_TOKENS in packages/themes/src/themes.spec.ts — a
 * generated theme must satisfy the same contract as a built-in one.
 */
const REQUIRED_SHARED_TOKENS = [
  '--kj-bg-body', '--kj-bg-surface', '--kj-bg-field',
  '--kj-bg-elevated', '--kj-bg-overlay', '--kj-bg-inverse', '--kj-bg-disabled',
  '--kj-bg-primary', '--kj-bg-primary-subtle', '--kj-bg-accent', '--kj-bg-accent-subtle',
  '--kj-bg-info', '--kj-bg-info-subtle', '--kj-bg-success', '--kj-bg-success-subtle',
  '--kj-bg-warning', '--kj-bg-warning-subtle', '--kj-bg-danger', '--kj-bg-danger-subtle',
  '--kj-fg-default', '--kj-fg-muted', '--kj-fg-subtle', '--kj-fg-disabled',
  '--kj-fg-on-primary', '--kj-fg-on-accent', '--kj-fg-on-info', '--kj-fg-on-success',
  '--kj-fg-on-warning', '--kj-fg-on-danger', '--kj-fg-on-inverse',
  '--kj-fg-primary', '--kj-fg-accent', '--kj-fg-info', '--kj-fg-success', '--kj-fg-warning', '--kj-fg-danger',
  '--kj-border-default', '--kj-border-muted', '--kj-border-strong', '--kj-border-control',
  '--kj-border-focus', '--kj-border-disabled', '--kj-border-primary', '--kj-border-danger',
  '--kj-shadow-sm', '--kj-shadow-md', '--kj-shadow-lg', '--kj-shadow-focus',
  '--kj-radius-box', '--kj-radius-field', '--kj-radius-selector', '--kj-border', '--kj-depth',
  '--kj-transition',
  '--kj-chart-1', '--kj-chart-2', '--kj-chart-3', '--kj-chart-4', '--kj-chart-5', '--kj-chart-6',
];

function themeDecls(css: string, name: string): Map<string, string> {
  const out = new Map<string, string>();
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selector.includes(`[data-theme="${name}"]`)) return;
    rule.walkDecls((d) => {
      out.set(d.prop, d.value);
    });
  });
  return out;
}

describe('serializeToScopedBlock', () => {
  const css = serializeToScopedBlock('my-theme', deriveTokens(DRAFT));
  const decls = themeDecls(css, 'my-theme');

  test('emits a [data-theme="X"] rule inside @layer kj.shared, like a built-in theme', () => {
    const root = postcss.parse(css);
    const layers: string[] = [];
    root.walkAtRules('layer', (at) => {
      layers.push(at.params);
    });
    expect(layers).toEqual(['kj.shared']);
    let rule: postcss.Rule | undefined;
    root.walkRules((r) => {
      rule = r;
    });
    expect(rule?.selector).toBe('[data-theme="my-theme"]');
    expect(rule?.parent?.type).toBe('atrule');
  });

  test('declares every token in the shared contract', () => {
    for (const t of REQUIRED_SHARED_TOKENS) expect(decls.has(t), t).toBe(true);
  });

  test('emits the density ramp names the library reads, not the dead --kj-text-body / --kj-text-small', () => {
    expect(decls.get('--kj-text-base')).toBe('1rem');
    expect(decls.get('--kj-text-sm')).toBe('0.875rem');
    expect(decls.has('--kj-text-body')).toBe(false);
    expect(decls.has('--kj-text-small')).toBe(false);
  });

  test('derives the six *-subtle fills from the intent fill over the body', () => {
    expect(decls.get('--kj-bg-primary-subtle')).toBe('color-mix(in oklch, oklch(57% 0.24 27) 12%, oklch(98% 0.002 247))');
    expect(decls.get('--kj-bg-danger-subtle')).toMatch(/^color-mix\(in oklch, oklch\(57% 0\.24 27\) 12%, /);
  });

  test('derives the 3:1 control boundary from the ink, not from the elevated surface', () => {
    expect(decls.get('--kj-border-control')).toBe('color-mix(in oklch, oklch(20% 0.01 247) 45%, oklch(98% 0.002 247))');
  });

  test('produces syntactically valid CSS', () => {
    expect(() => postcss.parse(css)).not.toThrow();
  });

  test('sets color-scheme based on body lightness', () => {
    expect(decls.get('color-scheme')).toBe('light');
    const dark = { ...DRAFT, bg: { ...DRAFT.bg, 'bg-body': 'oklch(15% 0.01 0)' } };
    expect(themeDecls(serializeToScopedBlock('x', deriveTokens(dark)), 'x').get('color-scheme')).toBe('dark');
  });
});
