import { InjectionToken, Provider } from '@angular/core';

/**
 * Animation shape preset for `KjSpinner`. Reflected to `data-animation`;
 * themes own the keyframes.
 */
export type KjSpinnerAnimation = 'spin' | 'dots' | 'pulse' | 'bars';

export interface KjSpinnerConfig {
  variants: string[];
  sizes: string[];
  animations: string[];
  defaults: { variant: string; size: string; animation: string; ariaLabel: string };
}

/**
 * Default Spinner presets shipped by kouji-ui. Exported so consumers can
 * spread them when extending: `[...KJ_SPINNER_DEFAULTS.animations, 'ring']`.
 */
export const KJ_SPINNER_DEFAULTS: KjSpinnerConfig = {
  variants: ['neutral', 'primary', 'secondary', 'success', 'warning', 'error', 'info'],
  sizes: ['xs', 'sm', 'md', 'lg'],
  animations: ['spin', 'dots', 'pulse', 'bars'],
  defaults: { variant: 'neutral', size: 'md', animation: 'spin', ariaLabel: 'Loading' },
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
 * Configures the Spinner presets for the enclosing injector. Replaces (does
 * not merge) `variants`, `sizes`, and `animations`; spread
 * `KJ_SPINNER_DEFAULTS.*` to extend.
 */
export function provideKjSpinner(config: Partial<KjSpinnerConfig>): Provider[] {
  return [
    {
      provide: KJ_SPINNER_CONFIG,
      useValue: { ...KJ_SPINNER_DEFAULTS, ...config },
    },
  ];
}
