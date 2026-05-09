import { clampChroma, converter, formatHex } from 'culori';
import { analogous, complementary, triadic } from './harmonies';
import { pickInspiringSeedHex } from './seed-swatches';
import type { ColorSlot, ShapeKey } from './types';

const toOklch = converter('oklch');

export type Harmony = 'analogous' | 'complementary' | 'triadic';

export interface DeriveOpts {
  mode: 'light' | 'dark';
  harmony?: Harmony;
}

function oklchHex(l: number, c: number, h: number): string {
  return formatHex(clampChroma({ mode: 'oklch', l, c, h }, 'oklch')) ?? '#000000';
}

const SEMANTIC_HUES = { info: 220, success: 145, warning: 70, destructive: 25 } as const;

/**
 * Derive a 9-slot palette from a single seed color.
 *
 * `primary` is the seed; `secondary` is +30° (analogous); `accent` follows the
 * `harmony` option (default `triadic`); `base-100` and `neutral` are tinted by
 * the seed's hue so the surface feels cohesive with the brand color.
 *
 * Semantic colors (info/success/warning/destructive) use canonical hues but
 * borrow the seed's lightness and chroma ranges, keeping them recognizable
 * while harmonizing with the rest of the palette. All conversions go through
 * `clampChroma` to stay inside the sRGB gamut.
 *
 * @param seed - Brand color as a 6-digit hex string (e.g. `#3366cc`).
 * @param opts - Derivation options. `mode` selects light/dark base; `harmony`
 *   selects how `accent` relates to the seed.
 * @returns A record mapping every {@link ColorSlot} to a hex color.
 */
export function deriveFromSeed(seed: string, opts: DeriveOpts): Record<ColorSlot, string> {
  const harmony: Harmony = opts.harmony ?? 'triadic';
  const c = toOklch(seed);
  const seedL = c?.l ?? 0.6;
  const seedC = c?.c ?? 0.15;
  const seedH = c?.h ?? 0;

  const base100 = opts.mode === 'light'
    ? oklchHex(0.98, 0.005, seedH)
    : oklchHex(0.15, 0.01, seedH);

  const accentHex = harmony === 'analogous'
    ? analogous(seed)
    : harmony === 'complementary'
      ? complementary(seed)
      : triadic(seed);

  const semantic = (hue: number): string => oklchHex(
    Math.max(0.45, Math.min(0.7, seedL)),
    Math.max(0.1, Math.min(0.18, seedC)),
    hue,
  );

  return {
    'base-100': base100,
    primary: seed,
    secondary: analogous(seed),
    accent: accentHex,
    neutral: oklchHex(0.5, 0.02, seedH),
    info: semantic(SEMANTIC_HUES.info),
    success: semantic(SEMANTIC_HUES.success),
    warning: semantic(SEMANTIC_HUES.warning),
    destructive: semantic(SEMANTIC_HUES.destructive),
  };
}

export interface RandomOpts {
  random?: () => number;
}

/** Generate a fully-derived palette from a randomly chosen curated AAA seed (weighted by hue family),
 * random harmony, and light/dark mode. Inject a deterministic `random` for tests. */
export function randomAccessiblePalette(opts: RandomOpts = {}): Record<ColorSlot, string> {
  const rnd = opts.random ?? Math.random;
  const hex = pickInspiringSeedHex(rnd);
  const harmonies: Harmony[] = ['analogous', 'complementary', 'triadic'];
  const harmony = harmonies[Math.floor(rnd() * harmonies.length)]!;
  const mode: 'light' | 'dark' = rnd() < 0.5 ? 'light' : 'dark';
  return deriveFromSeed(hex, { mode, harmony });
}

/** Matches theme-config corner preset tiers for radius-box / radius-field. */
const RADIUS_STEP = [0, 4, 8, 16, 24];
const BORDER_OPTS = [0, 1, 2, 4];
const DEPTH_OPTS = [0, 1, 2];
const MOTION_OPTS = ['0s', '0.12s ease', '0.2s ease', '0.4s ease'] as const;

/** Random shape snapshot for “shuffle theme” (DaisyUI-style radii / border roulette). */
export function randomShapeSnapshot(random: () => number = Math.random): Record<ShapeKey, number> {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)]!;
  const radiusBox = pick(RADIUS_STEP);
  const radiusField = pick(RADIUS_STEP);
  return {
    radiusBox,
    radiusField,
    radiusSelector: radiusField,
    border: pick(BORDER_OPTS),
    depth: pick(DEPTH_OPTS),
  };
}

/** Random transition duration preset (pairs with {@link randomShapeSnapshot}). */
export function randomMotionTransition(random: () => number = Math.random): string {
  return MOTION_OPTS[Math.floor(random() * MOTION_OPTS.length)]!;
}
