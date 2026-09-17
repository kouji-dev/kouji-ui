import {
  Directive,
  InjectionToken,
  InputSignalWithTransform,
  Signal,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

/**
 * Shape of the preset configuration consumed by {@link KjVariant}. One per
 * consumer directive, provided via {@link bindPresets} from a per-component
 * config token.
 *
 * Public, semver-bound API.
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
 * Public, semver-bound API — provide it directly, or (preferably) derive it
 * from a per-component config token with {@link bindPresets}.
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
 * Public, semver-bound API — a compound parent provides it to cascade its own
 * resolved value onto its children.
 */
export const KJ_VARIANT_FALLBACK = new InjectionToken<Signal<string | undefined> | null>(
  'kj.variant.fallback',
);

/**
 * Preset directive composed via `hostDirectives` by every stylistic component
 * to expose a configurable `kjVariant` input that reflects to a `data-variant` host
 * attribute.
 *
 * The reflected value resolves as: explicit `kjVariant` input, else the
 * {@link KJ_VARIANT_FALLBACK} context (when a compound parent provides one), else
 * {@link KJ_VARIANT_PRESET}`.default` (the `provideKj*`-configurable default). An
 * unknown value is reflected as-is and warned about once in dev mode — the
 * directive never silently falls back, because the value may well have CSS.
 *
 * Application code composes this the same way the library does — via
 * `hostDirectives` plus {@link bindPresets}, not by importing it into a
 * template. See {@link bindPresets} for the full recipe.
 *
 * Public, semver-bound API.
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
  /**
   * Requested variant token. Default `undefined` (unset) so `resolvedVariant`
   * can fall back to the variant context and then the preset default.
   */
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
    if (kjDevMode()) {
      effect(() => {
        const v = this.resolvedVariant();
        if (!this.preset.values.includes(v)) {
          kjDevWarn(
            'kjVariant',
            `unknown variant "${v}". Allowed values: ${this.preset.values.join(', ')}.`,
          );
        }
      });
    }
  }
}
