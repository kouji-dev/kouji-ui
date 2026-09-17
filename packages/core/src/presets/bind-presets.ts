import { InjectionToken, Provider, inject } from '@angular/core';
import { KJ_VARIANT_PRESET } from './variant';
import { KJ_SIZE_PRESET } from './size';

/**
 * Generic shape every per-component config must expose to be consumable by
 * {@link bindPresets}. Add any further fields you need (label functions,
 * extra preset lists) — `bindPresets` only reads these three.
 *
 * **Public, semver-bound API.** Build your own preset-driven component on it
 * (see {@link bindPresets}).
 */
export interface KjBindablePresetConfig {
  variants: string[];
  sizes: string[];
  defaults: { variant: string; size: string };
}

/**
 * Returns providers that translate a per-component config token into the
 * shared preset tokens ({@link KJ_VARIANT_PRESET}, {@link KJ_SIZE_PRESET}).
 * Spread into a directive's `providers` array.
 *
 * This is the supported entry point for building a component that plays the
 * same `provideKj*` game as the shipped ones. The recipe is four lines:
 *
 * ```ts
 * export interface AcmeChipConfig extends KjBindablePresetConfig {}
 * export const ACME_CHIP_DEFAULTS: AcmeChipConfig = {
 *   variants: ['default', 'brand'], sizes: ['sm', 'md'],
 *   defaults: { variant: 'default', size: 'md' },
 * };
 * export const ACME_CHIP_CONFIG = new InjectionToken<AcmeChipConfig>(
 *   'acme.chip.config', { factory: () => ACME_CHIP_DEFAULTS });
 * export function provideAcmeChip(config: KjDeepPartial<AcmeChipConfig>) {
 *   return [{ provide: ACME_CHIP_CONFIG,
 *             useValue: mergeKjConfig(ACME_CHIP_DEFAULTS, config) }];
 * }
 *
 * \@Directive({
 *   selector: '[acmeChip]',
 *   hostDirectives: [
 *     { directive: KjVariant, inputs: ['kjVariant'] },
 *     { directive: KjSize, inputs: ['kjSize'] },
 *   ],
 *   providers: [...bindPresets(ACME_CHIP_CONFIG)],
 * })
 * export class AcmeChip {}
 * ```
 *
 * The composed {@link KjVariant} / {@link KjSize} then reflect `data-variant`
 * and `data-size`, resolve `explicit input > cascade fallback > configured
 * default`, and warn in dev mode on a value outside the configured list.
 *
 * **Public, semver-bound API** — see {@link KjExtensible} for opening the
 * matching input type.
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
