import {
  Directive,
  InjectionToken,
  InputSignalWithTransform,
  Signal,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';

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
 * Optional reactive fallback consulted by `KjVariant` when its input is not
 * set, *before* falling back to `KJ_VARIANT_PRESET.default`. Compound
 * parents (button group, pagination root) bridge their cascaded variant into
 * this token so children inherit it. Resolution order:
 *
 *   explicit input > fallback context > preset (config) default
 *
 * A `null` provider value (or no provider) means "no fallback".
 *
 * @internal
 */
export const KJ_VARIANT_FALLBACK = new InjectionToken<Signal<string | undefined> | null>(
  'kj.variant.fallback',
);

/**
 * Internal preset directive composed via `hostDirectives` by every stylistic
 * component to expose a configurable `variant` input that reflects to a
 * `data-variant` host attribute. App code does not import this directly.
 *
 * The reflected value resolves as: explicit `kjVariant` input, else the
 * `KJ_VARIANT_FALLBACK` context (when a compound parent provides one), else
 * `KJ_VARIANT_PRESET.default` (the `provideKj*`-configurable default).
 *
 * @internal
 */
@Directive({
  selector: '[kjVariant]',
  standalone: true,
  host: { '[attr.data-variant]': 'resolvedVariant()' },
})
export class KjVariant {
  private readonly preset = inject(KJ_VARIANT_PRESET);
  private readonly fallback = inject(KJ_VARIANT_FALLBACK, { optional: true });

  // Explicit field annotation pins the ng-packagr-emitted .d.ts shape —
  // without it ng-packagr collapses the write type to `string` (dropping the
  // `| undefined` flow-through), which trips the docs extractor and any
  // consumer trying to bind a `string | undefined` source.
  // The input intentionally stays `undefined` when unset (empty string
  // included) so `resolvedVariant` can tell "not set" apart from an explicit
  // choice and consult the fallback chain.
  readonly kjVariant: InputSignalWithTransform<string | undefined, string | undefined> = input(
    undefined as string | undefined,
    { transform: (v?: string) => v || undefined },
  );

  /**
   * The variant actually reflected to `data-variant`:
   * explicit input > fallback context > preset default.
   */
  readonly resolvedVariant: Signal<string> = computed(
    () => this.kjVariant() || this.fallback?.() || this.preset.default,
  );

  constructor() {
    if (isDevMode()) {
      effect(() => {
        const v = this.resolvedVariant();
        if (!this.preset.values.includes(v)) {
          console.warn(
            `[kj] unknown variant "${v}". Allowed values: ${this.preset.values.join(', ')}.`,
          );
        }
      });
    }
  }
}
