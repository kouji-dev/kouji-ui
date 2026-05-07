import { InjectionToken, Provider } from '@angular/core';

export interface KjLinkConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Link presets shipped by kouji-ui. Exported so consumers can spread
 * them when extending: `[...KJ_LINK_DEFAULTS.variants, 'brand']`.
 */
export const KJ_LINK_DEFAULTS: KjLinkConfig = {
  variants: ['primary', 'secondary', 'muted', 'destructive'],
  sizes: ['sm', 'md', 'lg', 'inherit'],
  defaults: { variant: 'primary', size: 'inherit' },
};

/**
 * DI token for the active Link presets. Default factory yields
 * `KJ_LINK_DEFAULTS`. Override via `provideKjLink(…)` at the application
 * scope (e.g. `bootstrapApplication`'s `providers` or a route's `providers`)
 * or at the component scope (a component's own `providers: […]`).
 */
export const KJ_LINK_CONFIG = new InjectionToken<KjLinkConfig>('kj.link.config', {
  factory: () => KJ_LINK_DEFAULTS,
});

/**
 * Configures the Link presets for the enclosing injector. Replaces (does not
 * merge) `variants` and `sizes`; spread `KJ_LINK_DEFAULTS.variants` to extend.
 *
 * Returns a `Provider[]` so it can be spread into either an environment
 * `providers` (`bootstrapApplication`, route config) or a component-level
 * `providers` array.
 */
export function provideKjLink(config: Partial<KjLinkConfig>): Provider[] {
  return [
    {
      provide: KJ_LINK_CONFIG,
      useValue: { ...KJ_LINK_DEFAULTS, ...config },
    },
  ];
}
