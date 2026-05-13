import type { DraftTheme } from './types';

export type BuiltInName =
  | 'kouji' | 'dark' | 'light' | 'retro' | 'cyberpunk' | 'corporate'
  | 'sakura' | 'bauhaus' | 'dune' | 'mint'
  | 'forest' | 'nord' | 'terminal';
export const BUILT_IN_NAMES: readonly BuiltInName[] = [
  'kouji', 'dark', 'light', 'retro', 'cyberpunk', 'corporate',
  'sakura', 'bauhaus', 'dune', 'mint',
  'forest', 'nord', 'terminal',
];

/* Resolved type-blocks per identity. Mirrors what base.css + theme.css
   actually produce at runtime. base default for `fontDisplay` is now sans
   — themes only opt into Syne or mono explicitly. */
const SANS_TYPE = {
  fontSans: 'system-ui, -apple-system, sans-serif',
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  fontDisplay: 'system-ui, -apple-system, sans-serif',
};
const BRAND_TYPE = {
  fontSans: 'system-ui, -apple-system, sans-serif',
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  fontDisplay: "'Syne', system-ui, sans-serif",
};
const MONO_TYPE = {
  fontSans: "'JetBrains Mono', monospace",
  fontMono: "'JetBrains Mono', monospace",
  fontDisplay: "'JetBrains Mono', monospace",
};
/** kouji: mono body + Syne display. */
const KOUJI_TYPE = {
  fontSans: "'JetBrains Mono', monospace",
  fontMono: "'JetBrains Mono', monospace",
  fontDisplay: "'Syne', system-ui, sans-serif",
};
const SHARED_SHAPE = { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 };
const SHARED_TYPOGRAPHY = { bodyRem: 1, smallRem: 0.875 };
const FAST = { transition: '0.12s ease' };
const BASE = { transition: '0.2s ease' };

/**
 * Hand-mirrored from packages/themes/src/themes/*.css. Single source of truth
 * for the editor's "fork from built-in" feature. Update this file when the
 * shipped theme CSS changes.
 *
 * Values are tuned for WCAG AA contrast (≥ 4.5:1) on every editable pair:
 *   - bg-body × fg-default        (Class A)
 *   - bg-{intent} × fg-on-{intent} (Class B)
 */
export const BUILT_IN_THEMES: Record<BuiltInName, DraftTheme> = {
  // Light "Paper (ink)" — pure white surfaces, ink primary, goldenrod accent.
  light: {
    name: 'light',
    shape: { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type: SANS_TYPE, motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#ffffff',
      'bg-surface':  '#ffffff',
      'bg-field':    '#f6f6f4',
      'bg-elevated': '#ffffff',
      'bg-primary':  '#1a1a1a',
      'bg-accent':   '#b8860b',
      'bg-info':     '#1e40af',
      'bg-success':  '#166534',
      'bg-warning':  '#d97706',
      'bg-danger':   '#991b1b',
    },
    fg: {
      'fg-default':     '#1a1a1a',
      'fg-on-primary':  '#ffffff',
      'fg-on-accent':   '#1a1a1a',
      'fg-on-info':     '#ffffff',
      'fg-on-success':  '#ffffff',
      'fg-on-warning':  '#1a1a1a',
      'fg-on-danger':   '#ffffff',
    },
  },

  dark: {
    name: 'dark', shape: SHARED_SHAPE, type: BRAND_TYPE, motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     'oklch(15% 0 0)',
      'bg-surface':  'oklch(22% 0 0)',
      'bg-field':    'oklch(22% 0 0)',
      'bg-elevated': 'oklch(35% 0 0)',
      'bg-primary':  'oklch(70% 0.16 250)',
      'bg-accent':   'oklch(70% 0.16 250)',
      'bg-info':     'oklch(70% 0.16 250)',
      'bg-success':  'oklch(70% 0.18 145)',
      'bg-warning':  'oklch(83% 0.16 90)',
      'bg-danger':   'oklch(72% 0.18 20)',
    },
    fg: {
      'fg-default':     'oklch(98% 0 0)',
      'fg-on-primary':  'oklch(8% 0 0)',
      'fg-on-accent':   'oklch(8% 0 0)',
      'fg-on-info':     'oklch(8% 0 0)',
      'fg-on-success':  'oklch(8% 0 0)',
      'fg-on-warning':  'oklch(8% 0 0)',
      'fg-on-danger':   'oklch(8% 0 0)',
    },
  },

  kouji: {
    name: 'kouji',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 1, depth: 0 },
    type: KOUJI_TYPE,
    motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#0c0c0c',
      'bg-surface':  '#141414',
      'bg-field':    '#141414',
      'bg-elevated': '#1a1a1a',
      'bg-primary':  '#b8f500',
      'bg-accent':   '#b8f500',
      'bg-info':     'oklch(70% 0.16 250)',
      'bg-success':  '#b8f500',
      'bg-warning':  'oklch(78% 0.17 60)',
      'bg-danger':   'oklch(63% 0.22 20)',
    },
    fg: {
      'fg-default':     '#f0ede6',
      'fg-on-primary':  '#0c0c0c',
      'fg-on-accent':   '#0c0c0c',
      'fg-on-info':     'oklch(8% 0 0)',
      'fg-on-success':  '#0c0c0c',
      'fg-on-warning':  'oklch(8% 0 0)',
      'fg-on-danger':   '#ffffff',
    },
  },

  retro: {
    name: 'retro',
    shape: { radiusBox: 8, radiusField: 8, radiusSelector: 8, border: 1, depth: 1 },
    type: BRAND_TYPE, motion: BASE,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#ede5d0',
      'bg-surface':  '#e4d8b4',
      'bg-field':    '#f4ecd8',
      'bg-elevated': '#fff8e4',
      'bg-primary':  '#a8332f',
      'bg-accent':   '#3f6c85',
      'bg-info':     '#3f6c85',
      'bg-success':  '#5f7f30',
      'bg-warning':  '#9a7a30',
      'bg-danger':   '#a8332f',
    },
    fg: {
      'fg-default':     '#282425',
      'fg-on-primary':  '#ede5d0',
      'fg-on-accent':   '#ede5d0',
      'fg-on-info':     '#ede5d0',
      'fg-on-success':  '#ede5d0',
      'fg-on-warning':  '#ede5d0',
      'fg-on-danger':   '#ede5d0',
    },
  },

  cyberpunk: {
    name: 'cyberpunk',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 2, depth: 0 },
    type: MONO_TYPE, motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#ffee00',
      'bg-surface':  '#f0d808',
      'bg-field':    '#f8e604',
      'bg-elevated': '#fff84e',
      'bg-primary':  '#a8002a',
      'bg-accent':   '#4d00b8',
      'bg-info':     '#003a4d',
      'bg-success':  '#1a5500',
      'bg-warning':  '#7a3d00',
      'bg-danger':   '#990022',
    },
    fg: {
      'fg-default':     '#0a0a0a',
      'fg-on-primary':  '#ffee00',
      'fg-on-accent':   '#ffee00',
      'fg-on-info':     '#ffee00',
      'fg-on-success':  '#ffee00',
      'fg-on-warning':  '#ffee00',
      'fg-on-danger':   '#ffee00',
    },
  },

  // Corporate "Navy (banking)" — single signature navy, sharp small radius.
  corporate: {
    name: 'corporate',
    shape: { radiusBox: 4, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type: SANS_TYPE, motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#f5f7fa',
      'bg-surface':  '#ffffff',
      'bg-field':    '#eef1f5',
      'bg-elevated': '#ffffff',
      'bg-primary':  '#0a2540',
      'bg-accent':   '#0a2540',
      'bg-info':     '#0a2540',
      'bg-success':  '#15543d',
      'bg-warning':  '#a05a00',
      'bg-danger':   '#8b1a1a',
    },
    fg: {
      'fg-default':     '#0a2540',
      'fg-on-primary':  '#ffffff',
      'fg-on-accent':   '#ffffff',
      'fg-on-info':     '#ffffff',
      'fg-on-success':  '#ffffff',
      'fg-on-warning':  '#ffffff',
      'fg-on-danger':   '#ffffff',
    },
  },

  sakura: {
    name: 'sakura',
    shape: { radiusBox: 16, radiusField: 8, radiusSelector: 8, border: 1, depth: 1 },
    type: SANS_TYPE, motion: BASE,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#fef5f3',
      'bg-surface':  '#ffffff',
      'bg-field':    '#fbe9e6',
      'bg-elevated': '#ffffff',
      'bg-primary':  '#c2185b',
      'bg-accent':   '#6a1b4f',
      'bg-info':     '#5b4880',
      'bg-success':  '#2e7d52',
      'bg-warning':  '#d48838',
      'bg-danger':   '#9b1b3a',
    },
    fg: {
      'fg-default':     '#2d1830',
      'fg-on-primary':  '#ffffff',
      'fg-on-accent':   '#ffffff',
      'fg-on-info':     '#ffffff',
      'fg-on-success':  '#ffffff',
      'fg-on-warning':  '#2d1830',
      'fg-on-danger':   '#ffffff',
    },
  },

  bauhaus: {
    name: 'bauhaus',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 2, depth: 0 },
    type: BRAND_TYPE, motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#f5efe1',
      'bg-surface':  '#fffaef',
      'bg-field':    '#efe7d4',
      'bg-elevated': '#ffffff',
      'bg-primary':  '#b81728',
      'bg-accent':   '#1d3aff',
      'bg-info':     '#1d3aff',
      'bg-success':  '#1a7a3d',
      'bg-warning':  '#f4c20d',
      'bg-danger':   '#b81728',
    },
    fg: {
      'fg-default':     '#1a1a1a',
      'fg-on-primary':  '#ffffff',
      'fg-on-accent':   '#ffffff',
      'fg-on-info':     '#ffffff',
      'fg-on-success':  '#ffffff',
      'fg-on-warning':  '#1a1a1a',
      'fg-on-danger':   '#ffffff',
    },
  },

  dune: {
    name: 'dune',
    shape: { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type: SANS_TYPE, motion: BASE,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#f5e9d6',
      'bg-surface':  '#ead4b3',
      'bg-field':    '#f0dcc0',
      'bg-elevated': '#faf0db',
      'bg-primary':  '#3a2862',
      'bg-accent':   '#a8401a',
      'bg-info':     '#1e3a8a',
      'bg-success':  '#4a6b2b',
      'bg-warning':  '#b8841f',
      'bg-danger':   '#8b1818',
    },
    fg: {
      'fg-default':     '#2a1a40',
      'fg-on-primary':  '#f5e9d6',
      'fg-on-accent':   '#ffffff',
      'fg-on-info':     '#ffffff',
      'fg-on-success':  '#ffffff',
      'fg-on-warning':  '#2a1a40',
      'fg-on-danger':   '#ffffff',
    },
  },

  // Mint — fresh herbal cool greens, mono-hue spearmint primary/accent/success.
  mint: {
    name: 'mint',
    shape: { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type: SANS_TYPE, motion: BASE,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#eef5ec',
      'bg-surface':  '#ffffff',
      'bg-field':    '#def0db',
      'bg-elevated': '#ffffff',
      'bg-primary':  '#047857',
      'bg-accent':   '#047857',
      'bg-info':     '#195e85',
      'bg-success':  '#047857',
      'bg-warning':  '#a06400',
      'bg-danger':   '#b8362c',
    },
    fg: {
      'fg-default':     '#0c2a1f',
      'fg-on-primary':  '#ffffff',
      'fg-on-accent':   '#ffffff',
      'fg-on-info':     '#ffffff',
      'fg-on-success':  '#ffffff',
      'fg-on-warning':  '#ffffff',
      'fg-on-danger':   '#ffffff',
    },
  },

  forest: {
    name: 'forest',
    shape: { radiusBox: 8, radiusField: 8, radiusSelector: 8, border: 1, depth: 1 },
    type: SANS_TYPE, motion: BASE,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#1a2820',
      'bg-surface':  '#243630',
      'bg-field':    '#1f2e26',
      'bg-elevated': '#2d4035',
      'bg-primary':  '#d4a017',
      'bg-accent':   '#8fbc4a',
      'bg-info':     '#8ab8d4',
      'bg-success':  '#6ba33e',
      'bg-warning':  '#e0a830',
      'bg-danger':   '#d96550',
    },
    fg: {
      'fg-default':     '#e8e0c8',
      'fg-on-primary':  '#1a1a1a',
      'fg-on-accent':   '#1a1a1a',
      'fg-on-info':     '#1a1a1a',
      'fg-on-success':  '#1a1a1a',
      'fg-on-warning':  '#1a1a1a',
      'fg-on-danger':   '#1a1a1a',
    },
  },

  nord: {
    name: 'nord',
    shape: { radiusBox: 8, radiusField: 4, radiusSelector: 4, border: 1, depth: 1 },
    type: BRAND_TYPE, motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#2e3440',
      'bg-surface':  '#3b4252',
      'bg-field':    '#434c5e',
      'bg-elevated': '#4c566a',
      'bg-primary':  '#88c0d0',
      'bg-accent':   '#81a1c1',
      'bg-info':     '#88c0d0',
      'bg-success':  '#a3be8c',
      'bg-warning':  '#ebcb8b',
      'bg-danger':   '#d8a0a5',
    },
    fg: {
      'fg-default':     '#eceff4',
      'fg-on-primary':  '#1a1a1a',
      'fg-on-accent':   '#1a1a1a',
      'fg-on-info':     '#1a1a1a',
      'fg-on-success':  '#1a1a1a',
      'fg-on-warning':  '#1a1a1a',
      'fg-on-danger':   '#1a1a1a',
    },
  },

  terminal: {
    name: 'terminal',
    shape: { radiusBox: 0, radiusField: 0, radiusSelector: 0, border: 1, depth: 0 },
    type: MONO_TYPE, motion: FAST,
    typography: SHARED_TYPOGRAPHY,
    bg: {
      'bg-body':     '#000000',
      'bg-surface':  '#050505',
      'bg-field':    '#0a0a0a',
      'bg-elevated': '#0f0f0f',
      'bg-primary':  '#00ff66',
      'bg-accent':   '#00ff66',
      'bg-info':     '#00d4ff',
      'bg-success':  '#00ff66',
      'bg-warning':  '#ffd000',
      'bg-danger':   '#ff5050',
    },
    fg: {
      'fg-default':     '#b6ffce',
      'fg-on-primary':  '#000000',
      'fg-on-accent':   '#000000',
      'fg-on-info':     '#000000',
      'fg-on-success':  '#000000',
      'fg-on-warning':  '#000000',
      'fg-on-danger':   '#000000',
    },
  },
};
