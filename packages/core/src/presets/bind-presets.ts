import { InjectionToken, Provider, inject } from '@angular/core';
import { KJ_VARIANT_PRESET } from './variant';
import { KJ_SIZE_PRESET } from './size';

/**
 * Generic shape every per-component config must expose to be consumable by
 * `bindPresets`. Consumers free to add fields beyond these.
 *
 * @internal
 */
export interface KjBindablePresetConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Returns providers that translate a per-component config token into the
 * shared preset tokens (`KJ_VARIANT_PRESET`, `KJ_SIZE_PRESET`). Spread into a
 * consumer directive's `providers` array.
 *
 * @internal
 */
export function bindPresets<T extends KjBindablePresetConfig>(
  configToken: InjectionToken<T>,
): Provider[] {
  return [
    {
      provide: KJ_VARIANT_PRESET,
      useFactory: () => {
        const c = inject(configToken);
        return { values: c.variants, default: c.defaults.variant };
      },
    },
    {
      provide: KJ_SIZE_PRESET,
      useFactory: () => {
        const c = inject(configToken);
        return { values: c.sizes, default: c.defaults.size };
      },
    },
  ];
}
