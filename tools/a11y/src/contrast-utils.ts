/**
 * WCAG 2.x contrast utilities. Supports hex (`#rgb` / `#rrggbb`),
 * `rgb(r,g,b)`, and CSS `oklch(L% C H)` / `oklch(L C H)` colours.
 *
 * Reports from axe-core already normalise computed colours to hex/rgb so the
 * report flow only needs hex parsing; OKLCH support is here so the CLI can
 * audit raw theme values like `oklch(48% 0.20 250)` straight from the
 * `packages/themes/src/themes/*.css` files.
 */

export interface Rgb { r: number; g: number; b: number }

export interface ContrastVerdict {
  ratio: number;            // 1..21, rounded to 2 decimals
  aa: { normal: boolean; large: boolean };
  aaa: { normal: boolean; large: boolean };
}

const HEX_3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB   = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i;
// oklch(L% C H) or oklch(L C H) — alpha (/A) is parsed but ignored for contrast.
const OKLCH = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*[\d.%]+)?\s*\)$/i;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function gamma(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** Björn Ottosson's OKLCH → linear sRGB → gamma sRGB pipeline, clamped to byte range. */
function oklchToRgb(L: number, C: number, hDeg: number): Rgb {
  const a = C * Math.cos((hDeg * Math.PI) / 180);
  const b = C * Math.sin((hDeg * Math.PI) / 180);
  const lp = L + 0.3963377774 * a + 0.2158037573 * b;
  const mp = L - 0.1055613458 * a - 0.0638541728 * b;
  const sp = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = lp * lp * lp;
  const m = mp * mp * mp;
  const s = sp * sp * sp;
  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const r = clamp(gamma(rLin), 0, 1) * 255;
  const g = clamp(gamma(gLin), 0, 1) * 255;
  const bb = clamp(gamma(bLin), 0, 1) * 255;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(bb) };
}

export function parseColor(input: string): Rgb {
  const s = input.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(HEX_6))) {
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }
  if ((m = s.match(HEX_3))) {
    return {
      r: parseInt(m[1] + m[1], 16),
      g: parseInt(m[2] + m[2], 16),
      b: parseInt(m[3] + m[3], 16),
    };
  }
  if ((m = s.match(RGB))) {
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  if ((m = s.match(OKLCH))) {
    const L = m[2] === '%' ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
    return oklchToRgb(L, parseFloat(m[3]), parseFloat(m[4]));
  }
  throw new Error(`Unsupported colour '${input}'. Use #rgb, #rrggbb, rgb(r,g,b), or oklch(L% C H).`);
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbChannel(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function verdict(ratio: number): ContrastVerdict {
  return {
    ratio,
    aa:  { normal: ratio >= 4.5, large: ratio >= 3   },
    aaa: { normal: ratio >= 7,   large: ratio >= 4.5 },
  };
}

export function evaluate(fg: string, bg: string): ContrastVerdict {
  return verdict(contrastRatio(parseColor(fg), parseColor(bg)));
}

/** A library-curated catalogue of "always-on-hand" foreground candidates. */
export const FG_CANDIDATES: readonly { name: string; css: string }[] = [
  { name: 'pure-black', css: '#000000' },
  { name: 'gray-950',   css: 'oklch(8% 0 0)' },
  { name: 'gray-900',   css: 'oklch(15% 0 0)' },
  { name: 'gray-700',   css: 'oklch(35% 0 0)' },
  { name: 'gray-500',   css: 'oklch(60% 0 0)' },
  { name: 'gray-300',   css: 'oklch(82% 0 0)' },
  { name: 'gray-100',   css: 'oklch(95% 0 0)' },
  { name: 'gray-50',    css: 'oklch(98% 0 0)' },
  { name: 'pure-white', css: '#ffffff' },
] as const;

export interface Suggestion {
  name: string;
  css: string;
  hex: string;
  ratio: number;
  meetsTarget: boolean;
}

/**
 * Given a `bg`, evaluate every entry in {@link FG_CANDIDATES} as a foreground
 * candidate, sorted by descending ratio. `target` defaults to AA-normal
 * (4.5:1). Use this to pick a neutral fg that comfortably clears the target
 * without forcing a specific hue.
 */
export function suggestFgs(bg: string, target: number = 4.5): Suggestion[] {
  const bgRgb = parseColor(bg);
  return FG_CANDIDATES
    .map(({ name, css }) => {
      const fgRgb = parseColor(css);
      const ratio = contrastRatio(fgRgb, bgRgb);
      return { name, css, hex: rgbToHex(fgRgb), ratio, meetsTarget: ratio >= target };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
