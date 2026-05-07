/**
 * Color-model conversion helpers used by `KjColorPicker`.
 *
 * The picker keeps its canonical state in HSV+alpha — every other
 * representation is derived from these via the helpers in this module.
 *
 * @internal
 */

/** Clamp `n` into the inclusive `[lo, hi]` range. */
export function kjClamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Round to `digits` decimal places without floating-point ugliness. */
export function kjRound(n: number, digits = 0): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

/** Pad a non-negative integer to two lowercase hex digits. */
function toHex2(n: number): string {
  const v = kjClamp(Math.round(n), 0, 255);
  return v.toString(16).padStart(2, '0');
}

export interface KjRgb {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a: number; // 0..1
}

export interface KjHsv {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
  a: number; // 0..1
}

export interface KjHsl {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
  a: number; // 0..1
}

/**
 * Convert HSV (with alpha) to RGB. Algorithm follows the standard
 * formulation from Smith 1978 / W3C CSS Color spec.
 */
export function kjHsvToRgb(hsv: KjHsv): KjRgb {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = kjClamp(hsv.s, 0, 1);
  const v = kjClamp(hsv.v, 0, 1);
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1)      { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else             { r = c; b = x; }
  const m = v - c;
  return {
    r: kjRound((r + m) * 255),
    g: kjRound((g + m) * 255),
    b: kjRound((b + m) * 255),
    a: kjClamp(hsv.a, 0, 1),
  };
}

/** Convert RGB (0..255) to HSV. */
export function kjRgbToHsv(rgb: KjRgb): KjHsv {
  const r = kjClamp(rgb.r, 0, 255) / 255;
  const g = kjClamp(rgb.g, 0, 255) / 255;
  const b = kjClamp(rgb.b, 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r)      h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v, a: kjClamp(rgb.a, 0, 1) };
}

/** Convert HSV to HSL. */
export function kjHsvToHsl(hsv: KjHsv): KjHsl {
  const v = kjClamp(hsv.v, 0, 1);
  const s = kjClamp(hsv.s, 0, 1);
  const l = v * (1 - s / 2);
  const sl = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h: ((hsv.h % 360) + 360) % 360, s: sl, l, a: kjClamp(hsv.a, 0, 1) };
}

/** Format an RGB triple plus alpha as a `#rrggbb` or `#rrggbbaa` string. */
export function kjRgbToHex(rgb: KjRgb, includeAlpha: boolean): string {
  const base = '#' + toHex2(rgb.r) + toHex2(rgb.g) + toHex2(rgb.b);
  if (!includeAlpha) return base;
  return base + toHex2(rgb.a * 255);
}

/**
 * Parse a hex color string. Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`
 * with or without the leading `#`. Returns `null` on invalid input.
 */
export function kjParseHex(input: string): KjRgb | null {
  if (typeof input !== 'string') return null;
  let s = input.trim().toLowerCase();
  if (s.startsWith('#')) s = s.slice(1);
  if (!/^[0-9a-f]+$/.test(s)) return null;

  let r: string, g: string, b: string, a = 'ff';
  if (s.length === 3) {
    r = s[0] + s[0]; g = s[1] + s[1]; b = s[2] + s[2];
  } else if (s.length === 4) {
    r = s[0] + s[0]; g = s[1] + s[1]; b = s[2] + s[2]; a = s[3] + s[3];
  } else if (s.length === 6) {
    r = s.slice(0, 2); g = s.slice(2, 4); b = s.slice(4, 6);
  } else if (s.length === 8) {
    r = s.slice(0, 2); g = s.slice(2, 4); b = s.slice(4, 6); a = s.slice(6, 8);
  } else {
    return null;
  }
  return {
    r: parseInt(r, 16),
    g: parseInt(g, 16),
    b: parseInt(b, 16),
    a: parseInt(a, 16) / 255,
  };
}
