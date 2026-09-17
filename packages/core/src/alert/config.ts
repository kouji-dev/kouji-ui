import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/**
 * Shape of the Alert preset configuration. Mirrors `KjButtonConfig` —
 * `bindPresets(KJ_ALERT_CONFIG)` translates this into the shared
 * `KJ_VARIANT_PRESET` / `KJ_SIZE_PRESET` tokens consumed by the
 * `KjVariant` / `KjSize` host directives composed on `KjAlert`.
 */
export interface KjAlertConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Alert presets shipped by kouji-ui. Severities follow the APG /
 * shadcn / daisyUI taxonomy. Spread to extend:
 * `[...KJ_ALERT_DEFAULTS.variants, 'brand']`.
 */
export const KJ_ALERT_DEFAULTS: KjAlertConfig = {
  variants: ['info', 'success', 'warning', 'error', 'neutral'],
  sizes: ['sm', 'md', 'lg'],
  defaults: { variant: 'info', size: 'md' },
};

/**
 * DI token for the active Alert presets. Default factory yields
 * `KJ_ALERT_DEFAULTS`. Override via `provideKjAlert(…)`.
 */
export const KJ_ALERT_CONFIG = new InjectionToken<KjAlertConfig>('kj.alert.config', {
  factory: () => KJ_ALERT_DEFAULTS,
});

/**
 * Configures the Alert presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_ALERT_DEFAULTS} through {@link mergeKjConfig} —
 * pass only the fields you want to change, at any depth. Arrays still
 * **replace**; spread `KJ_ALERT_DEFAULTS.variants` to extend the list.
 */
export function provideKjAlert(config: KjDeepPartial<KjAlertConfig>): Provider[] {
  return [{ provide: KJ_ALERT_CONFIG, useValue: mergeKjConfig(KJ_ALERT_DEFAULTS, config) }];
}
