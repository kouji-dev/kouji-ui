import { converter, formatHex } from 'culori';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

export function hueShift(hex: string, deg: number): string {
  const c = toOklch(hex);
  if (!c) return hex;
  const next = {
    mode: 'oklch' as const,
    l: c.l ?? 0,
    c: c.c ?? 0,
    h: ((c.h ?? 0) + deg + 360) % 360,
  };
  const rgb = toRgb(next);
  return rgb ? formatHex(rgb) : hex;
}

export const analogous = (hex: string): string => hueShift(hex, 30);
export const complementary = (hex: string): string => hueShift(hex, 180);
export const triadic = (hex: string): string => hueShift(hex, 120);
