import type { DraftTheme } from './types';

export type BuiltInName = 'kouji' | 'dark' | 'light' | 'retro' | 'cyberpunk' | 'corporate';
export const BUILT_IN_NAMES: readonly BuiltInName[] =
  ['kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate'];

const SHARED_TYPE = {
  fontSans: 'system-ui, -apple-system, sans-serif',
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  fontDisplay: "'Syne', system-ui, sans-serif",
};
const SHARED_SHAPE = { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 };
const FAST = { transition: '0.12s ease' };

/**
 * Hand-mirrored from packages/themes/src/themes/*.css. Single source of truth
 * for the editor's "fork from built-in" feature. Update this file when the
 * shipped theme CSS changes.
 */
export const BUILT_IN_THEMES: Record<BuiltInName, DraftTheme> = {
  light: {
    name: 'light', shape: SHARED_SHAPE, type: SHARED_TYPE, motion: FAST,
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(98% 0 0)',
      primary:       'oklch(55% 0.20 250)',
      secondary:     'oklch(82% 0 0)',
      accent:        'oklch(62% 0.19 250)',
      neutral:       'oklch(35% 0 0)',
      info:          'oklch(62% 0.19 250)',
      success:       'oklch(70% 0.18 145)',
      warning:       'oklch(83% 0.16 90)',
      destructive:   'oklch(63% 0.22 20)',
    },
  },

  dark: {
    name: 'dark', shape: SHARED_SHAPE, type: SHARED_TYPE, motion: FAST,
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(15% 0 0)',
      primary:       'oklch(70% 0.16 250)',
      secondary:     'oklch(35% 0 0)',
      accent:        'oklch(70% 0.16 250)',
      neutral:       'oklch(60% 0 0)',
      info:          'oklch(70% 0.16 250)',
      success:       'oklch(70% 0.18 145)',
      warning:       'oklch(83% 0.16 90)',
      destructive:   'oklch(63% 0.22 20)',
    },
  },

  kouji: {
    name: 'kouji',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 1, depth: 0 },
    type: { fontSans: "'JetBrains Mono', monospace", fontMono: "'JetBrains Mono', monospace", fontDisplay: "'Syne', system-ui, sans-serif" },
    motion: FAST,
    contentOverrides: {
      'base-content':       'oklch(94% 0.01 80)',
      'primary-content':    'oklch(8% 0 0)',
      'accent-content':     'oklch(8% 0 0)',
    },
    colors: {
      'base-100':    'oklch(8% 0 0)',
      primary:       'oklch(91% 0.21 124)',
      secondary:     'oklch(35% 0 0)',
      accent:        'oklch(91% 0.21 124)',
      neutral:       'oklch(45% 0 0)',
      info:          'oklch(70% 0.16 250)',
      success:       'oklch(91% 0.21 124)',
      warning:       'oklch(83% 0.16 90)',
      destructive:   'oklch(63% 0.22 20)',
    },
  },

  retro: {
    name: 'retro',
    shape: { radiusBox: 8, radiusField: 8, radiusSelector: 8, border: 1, depth: 1 },
    type: SHARED_TYPE, motion: { transition: '0.2s ease' },
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(91% 0.04 80)',
      primary:       'oklch(78% 0.10 25)',
      secondary:     'oklch(82% 0.13 60)',
      accent:        'oklch(67% 0.06 230)',
      neutral:       'oklch(38% 0.05 35)',
      info:          'oklch(67% 0.06 230)',
      success:       'oklch(72% 0.13 130)',
      warning:       'oklch(78% 0.13 80)',
      destructive:   'oklch(58% 0.13 25)',
    },
  },

  cyberpunk: {
    name: 'cyberpunk',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 2, depth: 0 },
    type: { fontSans: "'JetBrains Mono', monospace", fontMono: "'JetBrains Mono', monospace", fontDisplay: "'JetBrains Mono', monospace" },
    motion: FAST,
    contentOverrides: {
      'primary-content':    'oklch(95% 0.18 100)',
      'accent-content':     'oklch(95% 0.18 100)',
      'destructive-content':'oklch(95% 0.18 100)',
    },
    colors: {
      'base-100':    'oklch(95% 0.18 100)',
      primary:       'oklch(60% 0.27 0)',
      secondary:     'oklch(82% 0.18 200)',
      accent:        'oklch(35% 0.27 290)',
      neutral:       'oklch(20% 0 0)',
      info:          'oklch(82% 0.18 200)',
      success:       'oklch(85% 0.30 130)',
      warning:       'oklch(70% 0.18 60)',
      destructive:   'oklch(60% 0.27 18)',
    },
  },

  corporate: {
    name: 'corporate',
    shape: { radiusBox: 4, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type: SHARED_TYPE, motion: FAST,
    contentOverrides: {},
    colors: {
      'base-100':    'oklch(100% 0 0)',
      primary:       'oklch(57% 0.20 265)',
      secondary:     'oklch(63% 0.06 250)',
      accent:        'oklch(75% 0.12 165)',
      neutral:       'oklch(20% 0.02 265)',
      info:          'oklch(73% 0.16 230)',
      success:       'oklch(77% 0.16 165)',
      warning:       'oklch(80% 0.16 75)',
      destructive:   'oklch(72% 0.16 20)',
    },
  },
};
