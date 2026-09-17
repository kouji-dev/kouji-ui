import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/** Shape accepted by `provideKjButton(…)`: the allowed variants / sizes and the defaults. */
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
  variants: ['default', 'destructive', 'outline', 'ghost', 'link', 'segmented'],
  sizes: ['xs', 'sm', 'md', 'lg', 'xl', 'icon'],
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
 * Configures the Button presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_BUTTON_DEFAULTS} through {@link mergeKjConfig}:
 * pass only the fields you want to change, at any depth
 * (`provideKjButton({ defaults: { size: 'lg' } })` keeps the shipped
 * `defaults.variant`). Arrays still **replace** — spread
 * `KJ_BUTTON_DEFAULTS.variants` to extend rather than swap the list.
 *
 * Returns a `Provider[]` so it can be spread into either an environment
 * `providers` (`bootstrapApplication`, route config) or a component-level
 * `providers` array.
 */
export function provideKjButton(config: KjDeepPartial<KjButtonConfig>): Provider[] {
  return [{ provide: KJ_BUTTON_CONFIG, useValue: mergeKjConfig(KJ_BUTTON_DEFAULTS, config) }];
}
