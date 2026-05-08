/**
 * Curated seed swatches for the theme generator.
 *
 * Each swatch represents a PRIMARY color tuned for **light mode**. The
 * curation contract enforces WCAG AAA (>= 7:1 contrast ratio) only against
 * the `lightBase` (white). Dark-mode variants are derived at runtime in a
 * later task by lightening the seed in OKLCH space.
 *
 * Curation contract:
 *  - hex must pass AAA on `lightBase` (white).
 *  - Coverage spans all nine hue families.
 *  - Total entries >= 30.
 */

export const HUE_FAMILIES = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'neutral',
] as const;

export type HueFamily = (typeof HUE_FAMILIES)[number];

/**
 * A single curated seed swatch.
 *
 * @property hex - Foreground color in `#rrggbb` form. Must pass AAA on `lightBase`.
 * @property name - Human-readable label shown in the picker UI.
 * @property hueFamily - Coarse hue bucket used for grouping the picker.
 * @property lightBase - The light-mode base-100 this swatch was curated against for AAA primary contrast.
 */
export interface SeedSwatch {
  hex: string;
  name: string;
  hueFamily: HueFamily;
  /** The light-mode base-100 this swatch was curated against for AAA primary contrast. */
  lightBase: string;
}

const LIGHT_BASE = '#ffffff';

/**
 * Curated primary-color seeds. Each entry passes WCAG AAA (>= 7:1) when used as
 * `primary` against its `lightBase`. Dark-mode variants are derived at runtime.
 */
export const SEED_SWATCHES: readonly SeedSwatch[] = [
  // red
  { hex: '#a30000', name: 'Crimson', hueFamily: 'red', lightBase: LIGHT_BASE },
  { hex: '#991b1b', name: 'Rose', hueFamily: 'red', lightBase: LIGHT_BASE },
  { hex: '#9f1239', name: 'Wine', hueFamily: 'red', lightBase: LIGHT_BASE },

  // orange
  { hex: '#9a3412', name: 'Rust', hueFamily: 'orange', lightBase: LIGHT_BASE },
  { hex: '#7c2d12', name: 'Umber', hueFamily: 'orange', lightBase: LIGHT_BASE },

  // yellow
  { hex: '#713f12', name: 'Olive', hueFamily: 'yellow', lightBase: LIGHT_BASE },
  { hex: '#78350f', name: 'Honey', hueFamily: 'yellow', lightBase: LIGHT_BASE },
  { hex: '#794200', name: 'Mustard', hueFamily: 'yellow', lightBase: LIGHT_BASE },

  // green
  { hex: '#166534', name: 'Forest', hueFamily: 'green', lightBase: LIGHT_BASE },
  { hex: '#14532d', name: 'Pine', hueFamily: 'green', lightBase: LIGHT_BASE },
  { hex: '#365314', name: 'Moss', hueFamily: 'green', lightBase: LIGHT_BASE },
  { hex: '#065f46', name: 'Emerald', hueFamily: 'green', lightBase: LIGHT_BASE },

  // teal
  { hex: '#115e59', name: 'Teal', hueFamily: 'teal', lightBase: LIGHT_BASE },
  { hex: '#155e75', name: 'Lagoon', hueFamily: 'teal', lightBase: LIGHT_BASE },
  { hex: '#00607b', name: 'Cyan Deep', hueFamily: 'teal', lightBase: LIGHT_BASE },

  // blue
  { hex: '#1e40af', name: 'Royal', hueFamily: 'blue', lightBase: LIGHT_BASE },
  { hex: '#1e3a8a', name: 'Navy', hueFamily: 'blue', lightBase: LIGHT_BASE },
  { hex: '#1847d1', name: 'Cobalt', hueFamily: 'blue', lightBase: LIGHT_BASE },
  { hex: '#0c4a6e', name: 'Steel', hueFamily: 'blue', lightBase: LIGHT_BASE },

  // purple
  { hex: '#5b21b6', name: 'Violet', hueFamily: 'purple', lightBase: LIGHT_BASE },
  { hex: '#6d28d9', name: 'Iris', hueFamily: 'purple', lightBase: LIGHT_BASE },
  { hex: '#581c87', name: 'Plum', hueFamily: 'purple', lightBase: LIGHT_BASE },
  { hex: '#4c1d95', name: 'Indigo', hueFamily: 'purple', lightBase: LIGHT_BASE },

  // pink
  { hex: '#9d174d', name: 'Magenta', hueFamily: 'pink', lightBase: LIGHT_BASE },
  { hex: '#831843', name: 'Mulberry', hueFamily: 'pink', lightBase: LIGHT_BASE },
  { hex: '#86198f', name: 'Fuchsia', hueFamily: 'pink', lightBase: LIGHT_BASE },

  // neutral
  { hex: '#1f2937', name: 'Slate', hueFamily: 'neutral', lightBase: LIGHT_BASE },
  { hex: '#27272a', name: 'Graphite', hueFamily: 'neutral', lightBase: LIGHT_BASE },
  { hex: '#262626', name: 'Charcoal', hueFamily: 'neutral', lightBase: LIGHT_BASE },
  { hex: '#1c1917', name: 'Espresso', hueFamily: 'neutral', lightBase: LIGHT_BASE },
] as const;
