import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/** Preset configuration consumed by `KjBadge` via `bindPresets`. */
export interface KjBadgeConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Badge presets shipped by kouji-ui.
 *
 * Badge and Tag overlap but are **not** the same vocabulary — see
 * {@link KJ_TAG_DEFAULTS}. `default`, `secondary` and `outline` render
 * identically on both; `destructive` is Badge-only.
 *
 * Spread to extend: `[...KJ_BADGE_DEFAULTS.variants, 'brand']`.
 */
export const KJ_BADGE_DEFAULTS: KjBadgeConfig = {
  variants: ['default', 'secondary', 'destructive', 'outline'],
  sizes: ['xs', 'sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
};

/**
 * DI token for the active Badge presets. Default factory yields
 * `KJ_BADGE_DEFAULTS`. Override via `provideKjBadge(…)` at the application
 * scope (e.g. `bootstrapApplication`'s `providers` or a route's `providers`)
 * or at the component scope (a component's own `providers: […]`).
 */
export const KJ_BADGE_CONFIG = new InjectionToken<KjBadgeConfig>('kj.badge.config', {
  factory: () => KJ_BADGE_DEFAULTS,
});

/**
 * Configures the Badge presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_BADGE_DEFAULTS} through {@link mergeKjConfig}:
 * pass only the fields you want to change, at any depth
 * (`provideKjBadge({ defaults: { size: 'sm' } })` keeps the shipped
 * `defaults.variant`). Arrays still **replace** — spread
 * `KJ_BADGE_DEFAULTS.variants` to extend rather than swap the list.
 *
 * Returns a `Provider[]` so it can be spread into either an environment
 * `providers` (`bootstrapApplication`, route config) or a component-level
 * `providers` array.
 *
 * @example
 * ```ts
 * provideKjBadge({ variants: [...KJ_BADGE_DEFAULTS.variants, 'brand'] })
 * ```
 * ```css
 * .kj-badge[data-variant="brand"] { --kj-badge-bg: var(--brand-500); }
 * ```
 */
export function provideKjBadge(config: KjDeepPartial<KjBadgeConfig>): Provider[] {
  return [{ provide: KJ_BADGE_CONFIG, useValue: mergeKjConfig(KJ_BADGE_DEFAULTS, config) }];
}
