// packages/core/src/icon/icon.mode.ts

/** Render mode inferred from an icon name. */
export type IconMode = 'svg' | 'font';

const FONT_PREFIX = '@font.';

/**
 * Infer render mode from icon name. Names starting with `@font.` use the
 * font code path (CSS `content`); everything else uses the svg/css-mask
 * code path.
 */
export function getIconMode(name: string): IconMode {
  return name.startsWith(FONT_PREFIX) ? 'font' : 'svg';
}
