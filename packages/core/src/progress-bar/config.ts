import { InjectionToken, Provider } from '@angular/core';

/**
 * Configurable preset shape for `KjProgressBar`. Mirrors `KjButtonConfig` /
 * `KjAlertConfig`: variants and sizes are validated against the consumer
 * application's preset (or extended via `provideKjProgressBar`).
 */
export interface KjProgressBarConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Progress Bar presets shipped by kouji-ui. Exported so consumers can
 * spread when extending: `[...KJ_PROGRESS_BAR_DEFAULTS.variants, 'brand']`.
 */
export const KJ_PROGRESS_BAR_DEFAULTS: KjProgressBarConfig = {
  variants: ['primary', 'success', 'warning', 'error'],
  sizes: ['xs', 'sm', 'md', 'lg'],
  defaults: { variant: 'primary', size: 'md' },
};

/**
 * DI token for the active Progress Bar presets. Default factory yields
 * `KJ_PROGRESS_BAR_DEFAULTS`. Override via `provideKjProgressBar(…)` at
 * application or component scope.
 */
export const KJ_PROGRESS_BAR_CONFIG = new InjectionToken<KjProgressBarConfig>(
  'kj.progress-bar.config',
  { factory: () => KJ_PROGRESS_BAR_DEFAULTS },
);

/**
 * Configures the Progress Bar presets for the enclosing injector. Replaces
 * (does not merge) `variants` and `sizes`; spread
 * `KJ_PROGRESS_BAR_DEFAULTS.variants` to extend.
 */
export function provideKjProgressBar(
  config: Partial<KjProgressBarConfig>,
): Provider[] {
  return [
    {
      provide: KJ_PROGRESS_BAR_CONFIG,
      useValue: { ...KJ_PROGRESS_BAR_DEFAULTS, ...config },
    },
  ];
}
