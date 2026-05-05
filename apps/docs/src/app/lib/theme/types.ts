export type ColorSlot =
  | 'base-100' | 'primary' | 'secondary' | 'accent' | 'neutral'
  | 'info' | 'success' | 'warning' | 'destructive';

export type ContentSlot =
  | 'base-200' | 'base-300'
  | 'base-content'
  | 'primary-content' | 'secondary-content' | 'accent-content' | 'neutral-content'
  | 'info-content' | 'success-content' | 'warning-content' | 'destructive-content';

export type ShapeKey   = 'radiusBox' | 'radiusField' | 'radiusSelector' | 'border' | 'depth';
export type FontKey    = 'fontSans'  | 'fontMono'    | 'fontDisplay';
export type MotionKey  = 'transition';

export interface DraftTheme {
  name: string;
  colors: Record<ColorSlot, string>;
  contentOverrides: Partial<Record<ContentSlot, string>>;
  shape:  Record<ShapeKey, number>;       // border + depth as numbers; radii in px
  type:   Record<FontKey, string>;        // CSS font-family stacks
  motion: Record<MotionKey, string>;      // CSS transition value
}

export interface ResolvedTokens {
  colors: Record<ColorSlot, string>;
  derivedBase: { base200: string; base300: string };
  contents: Record<ContentSlot, string>;
  shape:  Record<ShapeKey, string>;       // serialized w/ units
  type:   Record<FontKey, string>;
  motion: Record<MotionKey, string>;
}
