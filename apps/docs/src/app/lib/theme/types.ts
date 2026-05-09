export type ColorSlot =
  | 'base-100' | 'primary' | 'secondary' | 'accent' | 'neutral'
  | 'info' | 'success' | 'warning' | 'destructive';

export type ContentSlot =
  | 'base-200' | 'base-300'
  | 'base-content'
  | 'primary-content' | 'secondary-content' | 'accent-content' | 'neutral-content'
  | 'info-content' | 'success-content' | 'warning-content' | 'destructive-content';

export type ShapeKey      = 'radiusBox' | 'radiusField' | 'radiusSelector' | 'border' | 'depth';
export type FontKey       = 'fontSans'  | 'fontMono'    | 'fontDisplay';
export type MotionKey     = 'transition';
export type TypographyKey = 'bodyRem'   | 'smallRem';

export interface DraftTheme {
  name: string;
  colors: Record<ColorSlot, string>;
  contentOverrides: Partial<Record<ContentSlot, string>>;
  shape:      Record<ShapeKey, number>;
  type:       Record<FontKey, string>;
  typography: Record<TypographyKey, number>; // rem (e.g. 1, 0.875)
  motion:     Record<MotionKey, string>;
}

export interface ResolvedTokens {
  colors: Record<ColorSlot, string>;
  derivedBase: { base200: string; base300: string };
  contents: Record<ContentSlot, string>;
  shape:      Record<ShapeKey, string>;
  type:       Record<FontKey, string>;
  typography: Record<TypographyKey, string>; // serialized w/ unit, e.g. "1rem"
  motion:     Record<MotionKey, string>;
}
