import { converter, formatHex } from 'culori';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

/** OKLCH lightness `l` in 0–1 (higher = lighter). Used for shade ordering. */
export function hexOklchLightness(hex: string): number {
  const c = toOklch(hex);
  return c?.l ?? 0;
}

export function hexToOklch(hex: string): string {
  const c = toOklch(hex);
  if (!c) return 'oklch(50% 0 0)';
  return `oklch(${Math.round((c.l ?? 0) * 100)}% ${(c.c ?? 0).toFixed(3)} ${Math.round(c.h ?? 0)})`;
}

export function oklchToHex(css: string): string {
  const rgb = toRgb(css);
  if (!rgb) return '#000000';
  return formatHex(rgb);
}
