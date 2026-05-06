import { InjectionToken, Provider } from '@angular/core';

export interface KjButtonConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Button presets shipped by kouji-ui. Exported so consumers can spread
 * them when extending: `[...KJ_BUTTON_DEFAULTS.variants, 'brand']`.
 */
export const KJ_BUTTON_DEFAULTS: KjButtonConfig = {
  variants: ['default', 'destructive', 'outline', 'ghost', 'link'],
  sizes: ['sm', 'md', 'lg', 'icon'],
  defaults: { variant: 'default', size: 'md' },
};

/**
 * DI token for the active Button presets. Default factory yields
 * `KJ_BUTTON_DEFAULTS`. Override via `provideKjButton(…)` at the application
 * scope (e.g. `bootstrapApplication`'s `providers` or a route's `providers`)
 * or at the component scope (a component's own `providers: […]`).
 */
export const KJ_BUTTON_CONFIG = new InjectionToken<KjButtonConfig>('kj.button.config', {
  factory: () => KJ_BUTTON_DEFAULTS,
});

/**
 * Configures the Button presets for the enclosing injector. Replaces (does
 * not merge) `variants` and `sizes`; spread `KJ_BUTTON_DEFAULTS.variants` to
 * extend.
 *
 * Returns a `Provider[]` so it can be spread into either an environment
 * `providers` (`bootstrapApplication`, route config) or a component-level
 * `providers` array.
 */
export function provideKjButton(config: Partial<KjButtonConfig>): Provider[] {
  return [
    {
      provide: KJ_BUTTON_CONFIG,
      useValue: { ...KJ_BUTTON_DEFAULTS, ...config },
    },
  ];
}
