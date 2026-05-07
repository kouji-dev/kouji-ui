import { InjectionToken, Provider } from '@angular/core';

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
 * Configures the Alert presets for the enclosing injector. Replaces
 * (does not merge) `variants` / `sizes`; spread `KJ_ALERT_DEFAULTS.variants`
 * to extend.
 */
export function provideKjAlert(config: Partial<KjAlertConfig>): Provider[] {
  return [
    {
      provide: KJ_ALERT_CONFIG,
      useValue: { ...KJ_ALERT_DEFAULTS, ...config },
    },
  ];
}
