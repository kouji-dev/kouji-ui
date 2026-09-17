import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/** Variant / size presets and defaults for `KjLink`, set with `provideKjLink(…)`. */
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
 * Configures the Link presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_LINK_DEFAULTS} through {@link mergeKjConfig}: pass only the
 * fields you want to change, at any depth — `provideKjLink({ defaults: { variant: '…' } })`
 * keeps every other shipped default. Arrays still **replace**, so spread
 * `KJ_LINK_DEFAULTS.variants` to extend rather than swap the list.
 *
 * Returns a `Provider[]` so it can be spread into either an environment
 * `providers` (`bootstrapApplication`, route config) or a component-level
 * `providers` array.
 */
export function provideKjLink(config: KjDeepPartial<KjLinkConfig>): Provider[] {
  return [
    {
      provide: KJ_LINK_CONFIG,
      useValue: mergeKjConfig(KJ_LINK_DEFAULTS, config),
    },
  ];
}
