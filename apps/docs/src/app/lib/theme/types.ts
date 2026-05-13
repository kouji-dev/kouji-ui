/** Editable background slots — surfaces and intents (10 total). */
export type BgSlot =
  | 'bg-body'    | 'bg-surface' | 'bg-field'  | 'bg-elevated'
  | 'bg-primary' | 'bg-accent'  | 'bg-info'
  | 'bg-success' | 'bg-warning' | 'bg-danger';

/** Editable foreground slots — default text + on-intent text (7 total). */
export type FgSlot =
  | 'fg-default'
  | 'fg-on-primary' | 'fg-on-accent'  | 'fg-on-info'
  | 'fg-on-success' | 'fg-on-warning' | 'fg-on-danger';

export type ShapeKey      = 'radiusBox' | 'radiusField' | 'radiusSelector' | 'border' | 'depth';
export type FontKey       = 'fontSans'  | 'fontMono'    | 'fontDisplay';
export type MotionKey     = 'transition';
export type TypographyKey = 'bodyRem'   | 'smallRem';

export interface DraftTheme {
  name: string;
  bg: Record<BgSlot, string>;
  fg: Record<FgSlot, string>;
  shape:      Record<ShapeKey, number>;
  type:       Record<FontKey, string>;
  typography: Record<TypographyKey, number>; // rem (e.g. 1, 0.875)
  motion:     Record<MotionKey, string>;
}

export interface ResolvedTokens {
  bg: Record<BgSlot, string>;
  fg: Record<FgSlot, string>;
  shape:      Record<ShapeKey, string>;
  type:       Record<FontKey, string>;
  typography: Record<TypographyKey, string>; // serialized w/ unit, e.g. "1rem"
  motion:     Record<MotionKey, string>;
}

/** Convenience: every editable slot in one union. */
export type AnySlot = BgSlot | FgSlot;

export const BG_SLOTS: readonly BgSlot[] = [
  'bg-body', 'bg-surface', 'bg-field', 'bg-elevated',
  'bg-primary', 'bg-accent', 'bg-info', 'bg-success', 'bg-warning', 'bg-danger',
] as const;

export const FG_SLOTS: readonly FgSlot[] = [
  'fg-default',
  'fg-on-primary', 'fg-on-accent', 'fg-on-info',
  'fg-on-success', 'fg-on-warning', 'fg-on-danger',
] as const;

/** Intent identifiers (used by edge labels, tags). */
export type Intent = 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

export const INTENTS: readonly Intent[] = ['primary', 'accent', 'info', 'success', 'warning', 'danger'] as const;

/** Map an intent to its bg slot. */
export const BG_FOR_INTENT: Record<Intent, BgSlot> = {
  primary:  'bg-primary',
  accent:   'bg-accent',
  info:     'bg-info',
  success:  'bg-success',
  warning:  'bg-warning',
  danger:   'bg-danger',
};

/** Map an intent to its on-fg slot. */
export const FG_ON_FOR_INTENT: Record<Intent, FgSlot> = {
  primary:  'fg-on-primary',
  accent:   'fg-on-accent',
  info:     'fg-on-info',
  success:  'fg-on-success',
  warning:  'fg-on-warning',
  danger:   'fg-on-danger',
};
