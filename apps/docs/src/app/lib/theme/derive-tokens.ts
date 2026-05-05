import { oklch as parseOklch, formatCss } from 'culori';
import type { DraftTheme, ResolvedTokens, ColorSlot, ContentSlot } from './types';

const CONTENT_FOR: Record<Exclude<ColorSlot,'base-100'>, ContentSlot> = {
  primary: 'primary-content', secondary: 'secondary-content', accent: 'accent-content',
  neutral: 'neutral-content', info: 'info-content', success: 'success-content',
  warning: 'warning-content', destructive: 'destructive-content',
};

/** Parse an OKLCH string and return {l (0–100), c, h} or null if unparseable. */
function parseOklchTriple(css: string): { l: number; c: number; h: number } | null {
  const parsed = parseOklch(css);
  if (!parsed) return null;
  // culori returns l on [0,1]; normalize to 0–100 for our threshold logic.
  return { l: parsed.l * 100, c: parsed.c ?? 0, h: parsed.h ?? 0 };
}

/** Format an OKLCH back to the `oklch(XX% c h)` CSS string used in our themes. */
function formatOklch(l: number, c: number, h: number): string {
  return `oklch(${Math.round(l)}% ${c.toFixed(3)} ${Math.round(h)})`;
}

/** Light slot → dark content; dark slot → light content. Hue tinted from slot. */
export function deriveContent(slotCss: string): string {
  const t = parseOklchTriple(slotCss);
  if (!t) return 'oklch(15% 0 0)';
  return t.l > 60
    ? formatOklch(15, 0.02, t.h)
    : formatOklch(98, 0.02, t.h);
}

/** Derive base-200 / base-300 from base-100 by ±0.04 / ±0.08 lightness. */
export function deriveBaseShades(base100Css: string): { base200: string; base300: string } {
  const t = parseOklchTriple(base100Css);
  if (!t) return { base200: base100Css, base300: base100Css };
  const isLight = t.l > 50;
  const dir = isLight ? -1 : +1;
  return {
    base200: formatOklch(t.l + dir * 4, t.c, t.h),
    base300: formatOklch(t.l + dir * 8, t.c, t.h),
  };
}

export function deriveTokens(draft: DraftTheme): ResolvedTokens {
  const baseShades = deriveBaseShades(draft.colors['base-100']);
  const base200 = draft.contentOverrides['base-200'] ?? baseShades.base200;
  const base300 = draft.contentOverrides['base-300'] ?? baseShades.base300;

  const contents = { 'base-content': deriveContent(draft.colors['base-100']) } as Record<ContentSlot, string>;
  for (const slot of Object.keys(CONTENT_FOR) as Array<keyof typeof CONTENT_FOR>) {
    const contentKey = CONTENT_FOR[slot];
    contents[contentKey] = draft.contentOverrides[contentKey] ?? deriveContent(draft.colors[slot]);
  }
  // base-content can also be overridden manually
  if (draft.contentOverrides['base-content']) {
    contents['base-content'] = draft.contentOverrides['base-content']!;
  }

  return {
    colors: draft.colors,
    derivedBase: { base200, base300 },
    contents,
    shape: {
      radiusBox:      `${draft.shape.radiusBox}px`,
      radiusField:    `${draft.shape.radiusField}px`,
      radiusSelector: `${draft.shape.radiusSelector}px`,
      border:         `${draft.shape.border}px`,
      depth:          `${draft.shape.depth}`,
    },
    type:   draft.type,
    motion: draft.motion,
  };
}
