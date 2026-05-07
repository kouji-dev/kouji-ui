import { InjectionToken, Signal } from '@angular/core';
import type { KjHsl, KjHsv, KjRgb } from './color-picker.utils';

/** Output formats supported by `KjColorPicker`. */
export type KjColorFormat = 'hex' | 'rgb' | 'hsl';

/**
 * Public emitted value for `KjColorPicker`.
 * Concrete shape depends on the active `kjFormat`:
 *  - `'hex'` → `string` (`'#rrggbb'` or `'#rrggbbaa'` when alpha is on).
 *  - `'rgb'` → `[r, g, b]` or `[r, g, b, a]` when alpha is on.
 *  - `'hsl'` → `{ h, s, l }` or `{ h, s, l, a }` when alpha is on.
 */
export type KjColorValue =
  | string
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | { h: number; s: number; l: number }
  | { h: number; s: number; l: number; a: number };

/** A single preset swatch in the color picker's palette grid. */
export interface KjColorPreset {
  /** Any parseable hex color string. */
  readonly value: string;
  /** Optional accessible name announced to AT in place of the raw hex. */
  readonly label?: string;
}

/**
 * Shared state container exposed to every `KjColorPicker` sub-directive
 * via the `KJ_COLOR_PICKER` token. The root directive is the sole writer;
 * sub-directives read derived signals and call mutator methods.
 */
export interface KjColorPickerContext {
  // Canonical state
  readonly hue:        Signal<number>;
  readonly saturation: Signal<number>;
  readonly value:      Signal<number>;
  readonly alpha:      Signal<number>;

  // Derived projections
  readonly hex:  Signal<string>;
  readonly rgb:  Signal<KjRgb>;
  readonly hsv:  Signal<KjHsv>;
  readonly hsl:  Signal<KjHsl>;

  // Mutators
  setHue(h: number): void;
  setSaturationValue(s: number, v: number): void;
  setAlpha(a: number): void;
  setHex(hex: string): boolean;
  setRgb(r: number, g: number, b: number, a?: number): void;

  // UI state
  readonly open:      Signal<boolean>;
  readonly disabled:  Signal<boolean>;
  readonly format:    Signal<KjColorFormat>;
  readonly showAlpha: Signal<boolean>;
  readonly presets:   Signal<readonly KjColorPreset[]>;
  setOpen(open: boolean): void;

  // Wiring ids
  readonly panelId:   Signal<string>;
  readonly triggerId: Signal<string>;
}

/**
 * DI token consumed by every `KjColorPicker*` sub-directive. Provided by
 * the root `KjColorPicker` directive — sub-directives outside that
 * context throw at injection time in dev.
 */
export const KJ_COLOR_PICKER = new InjectionToken<KjColorPickerContext>(
  'KjColorPicker',
);
