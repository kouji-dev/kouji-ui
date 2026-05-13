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
  typography: { bodyRem: 1, smallRem: 0.875 },
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
      '--kj-radius-box', '--kj-radius-field', '--kj-radius-selector',
      '--kj-border', '--kj-depth',
      '--kj-font-sans', '--kj-font-mono', '--kj-font-display',
      '--kj-transition',
      '--kj-text-body', '--kj-text-small',
      // ─── new token system ───
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
