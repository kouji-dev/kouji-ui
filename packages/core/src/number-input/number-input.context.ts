import { InjectionToken, Signal } from '@angular/core';

/**
 * Shared context published by `[kjNumberInput]` and consumed by sibling
 * `[kjNumberStepper]` directives inside an optional `[kjNumberInputGroup]`.
 *
 * The number-input registers itself as the implementation; steppers call
 * `stepBy()` for click / long-press activations.
 */
export interface KjNumberInputContext {
  /** Current numeric value, or `null` for empty. */
  readonly value: Signal<number | null>;
  /** Effective minimum (`-Infinity` when no `kjMin` is set). */
  readonly min: Signal<number>;
  /** Effective maximum (`+Infinity` when no `kjMax` is set). */
  readonly max: Signal<number>;
  /** Step amount used for stepper presses and ArrowUp / ArrowDown. */
  readonly step: Signal<number>;
  /** PageUp / PageDown amount. Defaults to `step * 10`. */
  readonly pageStep: Signal<number>;
  /** Whether the field is fully disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Apply `n` step units. Positive for up, negative for down. Clamps + snaps. */
  stepBy(units: number, amount?: number): void;
  /** Set the value directly. Clamps + snaps. */
  setValue(value: number | null): void;
}

export const KJ_NUMBER_INPUT = new InjectionToken<KjNumberInputContext>('KjNumberInput');
