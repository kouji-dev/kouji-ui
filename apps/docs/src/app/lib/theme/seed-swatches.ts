import { clampChroma, converter, formatHex } from 'culori';

const toRgb = converter('rgb');

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

/** Column labels only (no per-swatch names). `yellow` reads as amber/gold in OKLCH ramps. */
export const HUE_FAMILY_LABELS: Record<HueFamily, string> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Amber',
  green: 'Green',
  teal: 'Teal',
  blue: 'Blue',
  purple: 'Purple',
  pink: 'Pink',
  neutral: 'Neutral',
};

/** Daisy-style shade depth per hue column (including neutrals). */
export const SEED_SHADE_COUNT = 10;

const LIGHT_BASE = '#ffffff';

const L_MAX = 0.93;
const L_MIN = 0.14;

/** OKLCH hue angles (°). Neutral column uses chroma 0 (hue unused). */
const HUE_ANGLE_DEG: Record<Exclude<HueFamily, 'neutral'>, number> = {
  red: 27,
  orange: 48,
  yellow: 82,
  green: 142,
  teal: 175,
  blue: 252,
  purple: 292,
  pink: 328,
};

/** Peak chroma before envelope (yellow stays softer). */
const CHROMA_PEAK: Record<Exclude<HueFamily, 'neutral'>, number> = {
  red: 0.2,
  orange: 0.18,
  yellow: 0.11,
  green: 0.17,
  teal: 0.15,
  blue: 0.19,
  purple: 0.18,
  pink: 0.18,
};

/** One OKLCH triple before gamut clamp / hex conversion. */
export interface OklchShadeSpec {
  readonly l: number;
  readonly c: number;
  /** Hue in degrees (meaningful when `c` > 0). */
  readonly h: number;
}

/**
 * Abstract seed matrix column — **no display colors**, only OKLCH parameters.
 * Index 0 = lightest (left when rendered as a horizontal ramp), last = darkest (right).
 */
export interface SeedHueColumnSpec {
  hueFamily: HueFamily;
  shades: readonly OklchShadeSpec[];
}

/**
 * Resolved column for UI: gamut-clamped **sRGB hex** swatches (optional pipeline step).
 */
export interface SeedHueColumn {
  hueFamily: HueFamily;
  shades: readonly string[];
}

export interface SeedSwatch {
  hex: string;
  hueFamily: HueFamily;
}

function oklchToHex(l: number, c: number, h: number): string {
  return formatHex(clampChroma({ mode: 'oklch', l, c, h }, 'oklch')) ?? '#000000';
}

function chromaAt(hueFamily: HueFamily, stepT: number): number {
  if (hueFamily === 'neutral') return 0;
  const peak = CHROMA_PEAK[hueFamily];
  return peak * (0.22 + 0.78 * Math.sin(Math.PI * stepT));
}

function relLum(hex: string): number {
  const c = toRgb(hex);
  if (!c) return 0;
  const lin = (x: number) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function contrastRatio(fg: string, bg: string): number {
  const la = relLum(fg);
  const lb = relLum(bg);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function buildHueColumnSpecs(hueFamily: HueFamily): readonly OklchShadeSpec[] {
  const shades: OklchShadeSpec[] = [];
  const n = SEED_SHADE_COUNT;
  for (let i = 0; i < n; i++) {
    const stepT = n <= 1 ? 0 : i / (n - 1);
    const l = L_MAX + (L_MIN - L_MAX) * stepT;
    if (hueFamily === 'neutral') {
      shades.push({ l, c: 0, h: 0 });
    } else {
      const h = HUE_ANGLE_DEG[hueFamily];
      const c = chromaAt(hueFamily, stepT);
      shades.push({ l, c, h });
    }
  }
  return shades;
}

/**
 * Daisy-style matrix: columns = hue families, steps = {@link SEED_SHADE_COUNT}.
 * Returns **only OKLCH parameters** — no hex / RGB until {@link resolveSeedSwatchMatrixToHex}.
 */
export function buildSeedSwatchMatrix(): readonly SeedHueColumnSpec[] {
  return HUE_FAMILIES.map(hueFamily => ({
    hueFamily,
    shades: buildHueColumnSpecs(hueFamily),
  }));
}

/** Gamut-clamp specs to sRGB and produce `#rrggbb` strings for painting / contrast checks. */
export function resolveSeedSwatchMatrixToHex(
  matrix: readonly SeedHueColumnSpec[],
): readonly SeedHueColumn[] {
  return matrix.map(col => ({
    hueFamily: col.hueFamily,
    shades: col.shades.map(s => oklchToHex(s.l, s.c, col.hueFamily === 'neutral' ? 0 : s.h)),
  }));
}

export function flattenSeedSwatchMatrix(
  matrix: readonly SeedHueColumn[] = resolveSeedSwatchMatrixToHex(buildSeedSwatchMatrix()),
): readonly SeedSwatch[] {
  const out: SeedSwatch[] = [];
  for (const col of matrix) {
    for (const hex of col.shades) {
      out.push({ hex, hueFamily: col.hueFamily });
    }
  }
  return out;
}

/** Flattened resolved matrix (length = 9 × 10). */
export const SEED_SWATCHES: readonly SeedSwatch[] = flattenSeedSwatchMatrix();

export function seedSwatchesForAccessiblePrimary(): readonly SeedSwatch[] {
  return SEED_SWATCHES.filter(s => contrastRatio(s.hex, LIGHT_BASE) >= 7);
}

export function pickInspiringSeedHex(random: () => number = Math.random): string {
  const matrix = resolveSeedSwatchMatrixToHex(buildSeedSwatchMatrix());
  const famIdx = Math.floor(random() * HUE_FAMILIES.length) % HUE_FAMILIES.length;
  const family = HUE_FAMILIES[famIdx];
  const column = matrix.find(c => c.hueFamily === family)!;
  const aaa = column.shades.filter(h => contrastRatio(h, LIGHT_BASE) >= 7);
  const pool = aaa.length > 0 ? aaa : column.shades.slice(-4);
  return pool[Math.floor(random() * pool.length)]!;
}
