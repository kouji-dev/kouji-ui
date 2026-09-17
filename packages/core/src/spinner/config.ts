import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';
import type { KjExtensible } from '../presets/preset-value';

/**
 * Animation shape preset for `KjSpinner`. Reflected to `data-animation`;
 * themes own the keyframes.
 *
 * Open by design ({@link KjExtensible}): the four shipped names autocomplete,
 * and any other string is accepted, reflected verbatim and validated in dev
 * mode against `KJ_SPINNER_CONFIG.animations` — register yours with
 * `provideKjSpinner({ animations: [...KJ_SPINNER_DEFAULTS.animations, 'ring'] })`
 * plus a `@keyframes` rule keyed on `[data-animation="ring"]`.
 */
export type KjSpinnerAnimation = KjExtensible<'spin' | 'dots' | 'pulse' | 'bars'>;

/**
 * Application-level Spinner presets: the variant, size and animation names
 * `KjSpinner` accepts, plus the values it falls back to when none is bound.
 * Provide a partial override with `provideKjSpinner()`.
 */
export interface KjSpinnerConfig {
  /** Known `kjVariant` values, validated in dev mode by `KjVariant`. */
  variants: string[];
  /** Known `kjSize` values, validated in dev mode by `KjSize`. */
  sizes: string[];
  /**
   * Known animation names. `KjSpinner` validates `kjAnimation` against this
   * list in dev mode (and warns once per unknown value) — the same contract
   * `variants` / `sizes` get through `KjVariant` / `KjSize`.
   */
  animations: string[];
  defaults: {
    variant: string;
    size: string;
    animation: string;
    /**
     * Accessible name for the spinner. Optional override — unset, it
     * resolves from the i18n catalog key `spinner.loading`.
     */
    ariaLabel?: string;
  };
}

/**
 * Default Spinner presets shipped by kouji-ui. Exported so consumers can
 * spread them when extending: `[...KJ_SPINNER_DEFAULTS.animations, 'ring']`.
 */
export const KJ_SPINNER_DEFAULTS: KjSpinnerConfig = {
  variants: ['neutral', 'primary', 'secondary', 'success', 'warning', 'error', 'info'],
  sizes: ['xs', 'sm', 'md', 'lg'],
  animations: ['spin', 'dots', 'pulse', 'bars'],
  // `ariaLabel` is deliberately absent: it resolves from the i18n catalog
  // (`spinner.loading`) so translating it needs no per-component config.
  defaults: { variant: 'neutral', size: 'md', animation: 'spin' },
};

/**
 * DI token for the active Spinner presets. Default factory yields
 * `KJ_SPINNER_DEFAULTS`. Override via `provideKjSpinner(…)` at the
 * application scope or at a component scope.
 */
export const KJ_SPINNER_CONFIG = new InjectionToken<KjSpinnerConfig>('kj.spinner.config', {
  factory: () => KJ_SPINNER_DEFAULTS,
});

/**
 * Configures the Spinner presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_SPINNER_DEFAULTS} through {@link mergeKjConfig} —
 * `provideKjSpinner({ defaults: { animation: 'ring' } })` keeps every other
 * shipped default. The three arrays (`variants`, `sizes`, `animations`) still
 * **replace**; spread `KJ_SPINNER_DEFAULTS.*` to extend one.
 */
export function provideKjSpinner(config: KjDeepPartial<KjSpinnerConfig>): Provider[] {
  return [{ provide: KJ_SPINNER_CONFIG, useValue: mergeKjConfig(KJ_SPINNER_DEFAULTS, config) }];
}
