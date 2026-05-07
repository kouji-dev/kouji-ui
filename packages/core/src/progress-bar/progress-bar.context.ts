import { InjectionToken, Signal } from '@angular/core';

/**
 * Shared state surfaced by `KjProgressBar` for `KjProgressBarFill` (and any
 * consumer-side child directives) to read.
 *
 * The root directive owns all derivations: `value` is the raw input,
 * `clampedValue` enforces `[min, max]`, `fraction` is the `0..1` reading the
 * fill consumes for CSS, and `valuenow` is the rounded integer the host emits
 * as `aria-valuenow`. `null` flows through every derived signal in
 * indeterminate mode so the fill knows to stop reading the fraction (and
 * themes can branch on `data-indeterminate`).
 */
export interface KjProgressBarContext {
  /** Raw value as provided, possibly null (indeterminate). */
  readonly value: Signal<number | null>;
  /** Clamped value in `[min, max]`, or `null` if indeterminate. */
  readonly clampedValue: Signal<number | null>;
  /** `0..1` fraction for CSS, or `null` if indeterminate. */
  readonly fraction: Signal<number | null>;
  /** Rounded integer for `aria-valuenow`, or `null` if indeterminate. */
  readonly valuenow: Signal<number | null>;
  /** True iff value is `null` (indeterminate mode). */
  readonly indeterminate: Signal<boolean>;
  /** `aria-valuemin` as provided. */
  readonly min: Signal<number>;
  /** `aria-valuemax` as provided. */
  readonly max: Signal<number>;
}

/** Injection token for `KjProgressBarContext`. */
export const KJ_PROGRESS_BAR = new InjectionToken<KjProgressBarContext>(
  'KjProgressBar',
);
