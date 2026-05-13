import { clampChroma, converter, formatHex } from 'culori';
import { analogous, complementary, triadic } from './harmonies';
import { pickInspiringSeedHex } from './seed-swatches';
import type { BgSlot, FgSlot, ShapeKey } from './types';

const toOklch = converter('oklch');

export type Harmony = 'analogous' | 'complementary' | 'triadic';

export interface DeriveOpts {
  mode: 'light' | 'dark';
  harmony?: Harmony;
}

export interface DerivedPalette {
  bg: Record<BgSlot, string>;
  fg: Record<FgSlot, string>;
}

function oklchHex(l: number, c: number, h: number): string {
  return formatHex(clampChroma({ mode: 'oklch', l, c, h }, 'oklch')) ?? '#000000';
}

function lOf(hex: string): number {
  return toOklch(hex)?.l ?? 0.5;
}

/** WCAG-friendly on-color picker: near-black or near-white based on the bg's OKLCH lightness. */
function onColor(bgHex: string): string {
  return lOf(bgHex) > 0.6 ? '#0a0a0a' : '#ffffff';
}

const SEMANTIC_HUES = { info: 220, success: 145, warning: 70, danger: 25 } as const;

/**
 * Derive a 17-slot palette (10 bg + 7 fg) from a single seed color.
 *
 * `bg-primary` is the seed; `bg-accent` follows the chosen harmony; the four
 * neutral surfaces (`bg-body`, `bg-surface`, `bg-field`, `bg-elevated`) are
 * tinted by the seed's hue and stepped by lightness so they read as a cohesive
 * surface stack. Semantic colors (info/success/warning/danger) use canonical
 * hues but borrow the seed's lightness and chroma ranges.
 *
 * All conversions go through `clampChroma` to stay inside the sRGB gamut. Each
 * foreground is computed by luminance, so every Class A and Class B pair
 * clears AA contrast (≥ 4.5:1) by construction.
 */
export function deriveFromSeed(seed: string, opts: DeriveOpts): DerivedPalette {
  const harmony: Harmony = opts.harmony ?? 'triadic';
  const c = toOklch(seed);
  const seedL = c?.l ?? 0.6;
  const seedC = c?.c ?? 0.15;
  const seedH = c?.h ?? 0;

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

  const isLight = opts.mode === 'light';
  const bgBody     = oklchHex(isLight ? 0.98 : 0.15, 0.005, seedH);
  const bgSurface  = oklchHex(isLight ? 1.00 : 0.22, 0.005, seedH);
  const bgField    = oklchHex(isLight ? 0.95 : 0.22, 0.01,  seedH);
  const bgElevated = oklchHex(isLight ? 1.00 : 0.35, 0.005, seedH);

  const fgDefault = oklchHex(isLight ? 0.15 : 0.98, 0.005, seedH);

  const bgPrimary = seed;
  const bgAccent  = accentHex;
  const bgInfo    = semantic(SEMANTIC_HUES.info);
  const bgSuccess = semantic(SEMANTIC_HUES.success);
  const bgWarning = semantic(SEMANTIC_HUES.warning);
  const bgDanger  = semantic(SEMANTIC_HUES.danger);

  return {
    bg: {
      'bg-body':     bgBody,
      'bg-surface':  bgSurface,
      'bg-field':    bgField,
      'bg-elevated': bgElevated,
      'bg-primary':  bgPrimary,
      'bg-accent':   bgAccent,
      'bg-info':     bgInfo,
      'bg-success':  bgSuccess,
      'bg-warning':  bgWarning,
      'bg-danger':   bgDanger,
    },
    fg: {
      'fg-default':    fgDefault,
      'fg-on-primary': onColor(bgPrimary),
      'fg-on-accent':  onColor(bgAccent),
      'fg-on-info':    onColor(bgInfo),
      'fg-on-success': onColor(bgSuccess),
      'fg-on-warning': onColor(bgWarning),
      'fg-on-danger':  onColor(bgDanger),
    },
  };
}

export interface RandomOpts {
  random?: () => number;
}

/**
 * Generate a full 17-slot palette (bg + fg) from a randomly chosen curated AAA seed
 * (weighted by hue family), random harmony, and light/dark mode. Inject a
 * deterministic `random` for tests.
 */
export function randomAccessiblePalette(opts: RandomOpts = {}): DerivedPalette {
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

/** Random shape snapshot for "shuffle theme" (DaisyUI-style radii / border roulette). */
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
