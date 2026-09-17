import { InjectionToken, Provider } from '@angular/core';
import { type KjDeepPartial, mergeKjConfig } from '../presets/merge-config';

/** Preset configuration consumed by `KjTag` via `bindPresets`. */
export interface KjTagConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Tag presets shipped by kouji-ui.
 *
 * Tag and Badge overlap but are **not** the same vocabulary: `default`,
 * `secondary` and `outline` render identically on both, `destructive` is
 * Badge-only (Tag's CSS aliases it onto `danger`), and `primary` / `success` /
 * `warning` / `danger` / `info` / `ghost` are Tag-only. Pick Tag when the
 * chip is interactive (removable, selectable) and Badge for inline status
 * text; do not assume a variant name carries across.
 *
 * Spread to extend: `[...KJ_TAG_DEFAULTS.variants, 'brand']`.
 */
export const KJ_TAG_DEFAULTS: KjTagConfig = {
  variants: [
    'default',
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'info',
    'outline',
    'ghost',
  ],
  sizes: ['xs', 'sm', 'md', 'lg'],
  defaults: { variant: 'default', size: 'md' },
};

/**
 * DI token for the active Tag presets. Default factory yields
 * `KJ_TAG_DEFAULTS`. Override via `provideKjTag(...)` at the application
 * scope or at a component scope.
 */
export const KJ_TAG_CONFIG = new InjectionToken<KjTagConfig>('kj.tag.config', {
  factory: () => KJ_TAG_DEFAULTS,
});

/**
 * Configures the Tag presets for the enclosing injector.
 *
 * Deep-merges over {@link KJ_TAG_DEFAULTS} through {@link mergeKjConfig} —
 * pass only the fields you want to change, at any depth. Arrays still
 * **replace**; spread `KJ_TAG_DEFAULTS.variants` to extend the list.
 */
export function provideKjTag(config: KjDeepPartial<KjTagConfig>): Provider[] {
  return [{ provide: KJ_TAG_CONFIG, useValue: mergeKjConfig(KJ_TAG_DEFAULTS, config) }];
}
