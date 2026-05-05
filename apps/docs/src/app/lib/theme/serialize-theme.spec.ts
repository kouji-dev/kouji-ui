import { describe, expect, test } from 'vitest';
import postcss from 'postcss';
import { serializeToScopedBlock } from './serialize-theme';
import { deriveTokens } from './derive-tokens';
import type { DraftTheme } from './types';

const DRAFT: DraftTheme = {
  name: 'my-theme',
  colors: {
    'base-100': 'oklch(98% 0.002 247)', primary: 'oklch(57% 0.24 27)',
    secondary: 'oklch(44% 0.03 256)', accent: 'oklch(60% 0.12 184)',
    neutral: 'oklch(44% 0.03 256)', info: 'oklch(54% 0.24 262)',
    success: 'oklch(64% 0.2 131)', warning: 'oklch(66% 0.18 58)',
    destructive: 'oklch(57% 0.24 27)',
  },
  contentOverrides: {},
  shape:  { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
  type:   { fontSans: 'Inter, system-ui', fontMono: 'JetBrains Mono', fontDisplay: 'Syne' },
  motion: { transition: '0.2s ease' },
};

describe('serializeToScopedBlock', () => {
  test('emits a [data-theme="X"] rule', () => {
    const css = serializeToScopedBlock('my-theme', deriveTokens(DRAFT));
    expect(css).toContain('[data-theme="my-theme"]');
  });

  test('includes every required token', () => {
    const css = serializeToScopedBlock('x', deriveTokens(DRAFT));
    const required = [
      '--kj-color-base-100', '--kj-color-base-200', '--kj-color-base-300', '--kj-color-base-content',
      '--kj-color-primary', '--kj-color-primary-content',
      '--kj-color-secondary', '--kj-color-secondary-content',
      '--kj-color-accent', '--kj-color-accent-content',
      '--kj-color-neutral', '--kj-color-neutral-content',
      '--kj-color-info', '--kj-color-info-content',
      '--kj-color-success', '--kj-color-success-content',
      '--kj-color-warning', '--kj-color-warning-content',
      '--kj-color-destructive', '--kj-color-destructive-content',
      '--kj-radius-box', '--kj-radius-field', '--kj-radius-selector',
      '--kj-border', '--kj-depth',
      '--kj-font-sans', '--kj-font-mono', '--kj-font-display',
      '--kj-transition',
    ];
    for (const t of required) expect(css).toContain(t);
  });

  test('produces syntactically valid CSS', () => {
    const css = serializeToScopedBlock('x', deriveTokens(DRAFT));
    expect(() => postcss.parse(css)).not.toThrow();
  });

  test('sets color-scheme based on base-100 lightness', () => {
    const cssLight = serializeToScopedBlock('x', deriveTokens(DRAFT));
    expect(cssLight).toMatch(/color-scheme:\s*light/);

    const dark = { ...DRAFT, colors: { ...DRAFT.colors, 'base-100': 'oklch(15% 0.01 0)' } };
    const cssDark = serializeToScopedBlock('x', deriveTokens(dark));
    expect(cssDark).toMatch(/color-scheme:\s*dark/);
  });
});
