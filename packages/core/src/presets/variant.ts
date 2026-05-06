import { Directive, InjectionToken, effect, inject, input, isDevMode } from '@angular/core';

/**
 * Shape of the preset configuration consumed by `KjVariant`. One per consumer
 * directive, provided via `bindPresets` from a per-component config token.
 *
 * @internal
 */
export interface KjVariantPreset {
  values: string[];
  default: string;
}

/**
 * DI token holding the variant preset for the current consumer's injector
 * scope. Resolved by `KjVariant` at construction time.
 *
 * Default factory: `{ values: ['default'], default: 'default' }`.
 *
 * @internal
 */
export const KJ_VARIANT_PRESET = new InjectionToken<KjVariantPreset>('kj.variant.preset', {
  factory: () => ({ values: ['default'], default: 'default' }),
});

/**
 * Internal preset directive composed via `hostDirectives` by every stylistic
 * component to expose a configurable `variant` input that reflects to a
 * `data-variant` host attribute. App code does not import this directly.
 *
 * @internal
 */
@Directive({
  selector: '[kjVariant]',
  standalone: true,
  host: { '[attr.data-variant]': 'kjVariant()' },
})
export class KjVariant {
  private readonly preset = inject(KJ_VARIANT_PRESET);

  readonly kjVariant = input<string, string | undefined>(this.preset.default, {
    transform: (v: string | undefined) => v || this.preset.default,
  });

  constructor() {
    if (isDevMode()) {
      effect(() => {
        const v = this.kjVariant();
        if (!this.preset.values.includes(v)) {
          console.warn(
            `[kj] unknown variant "${v}". Allowed values: ${this.preset.values.join(', ')}.`,
          );
        }
      });
    }
  }
}
