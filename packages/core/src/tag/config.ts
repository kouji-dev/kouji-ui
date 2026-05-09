import { InjectionToken, Provider } from '@angular/core';

/** Preset configuration consumed by `KjTag` via `bindPresets`. */
export interface KjTagConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Default Tag presets shipped by kouji-ui. Variant list is intentionally
 * kept in lock-step with `KjBadge` (see analysis §"Variant parity with
 * Badge") — a non-interactive Tag and a Badge with the same `kjVariant`
 * must look identical.
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
 * Configures the Tag presets for the enclosing injector. Replaces (does
 * not merge) `variants` and `sizes`; spread `KJ_TAG_DEFAULTS.variants` to
 * extend.
 */
export function provideKjTag(config: Partial<KjTagConfig>): Provider[] {
  return [
    {
      provide: KJ_TAG_CONFIG,
      useValue: { ...KJ_TAG_DEFAULTS, ...config },
    },
  ];
}
