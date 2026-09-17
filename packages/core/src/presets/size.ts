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
 * Shape of the preset configuration consumed by {@link KjSize}. One per
 * consumer directive, provided via {@link bindPresets} from a per-component
 * config token.
 *
 * Public, semver-bound API.
 */
export interface KjSizePreset {
  values: string[];
  default: string;
}

/**
 * DI token holding the size preset for the current consumer's injector scope.
 * Resolved by {@link KjSize} at construction time.
 *
 * Default factory: `{ values: ['md'], default: 'md' }`.
 *
 * Public, semver-bound API — provide it directly, or (preferably) derive it
 * from a per-component config token with {@link bindPresets}.
 */
export const KJ_SIZE_PRESET = new InjectionToken<KjSizePreset>('kj.size.preset', {
  factory: () => ({ values: ['md'], default: 'md' }),
});

/**
 * Optional reactive fallback consulted by `KjSize` when its input is not
 * set, *before* falling back to `KJ_SIZE_PRESET.default`. Compound parents
 * (button group, pagination root) bridge their cascaded size into this token
 * so children inherit it. Resolution order:
 *
 *   explicit input > fallback context > preset (config) default
 *
 * A `null` provider value (or no provider) means "no fallback".
 *
 * Public, semver-bound API — a compound parent provides it to cascade its own
 * resolved value onto its children.
 */
export const KJ_SIZE_FALLBACK = new InjectionToken<Signal<string | undefined> | null>(
  'kj.size.fallback',
);

/**
 * Preset directive composed via `hostDirectives` by every stylistic component
 * to expose a configurable `kjSize` input that reflects to a `data-size` host
 * attribute.
 *
 * The reflected value resolves as: explicit `kjSize` input, else the
 * {@link KJ_SIZE_FALLBACK} context (when a compound parent provides one), else
 * {@link KJ_SIZE_PRESET}`.default` (the `provideKj*`-configurable default). An
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
  selector: '[kjSize]',
  standalone: true,
  host: { '[attr.data-size]': 'resolvedSize()' },
})
export class KjSize {
  private readonly preset = inject(KJ_SIZE_PRESET);
  private readonly fallback = inject(KJ_SIZE_FALLBACK, { optional: true });

  /**
   * Requested size token. Default `undefined` (unset) so `resolvedSize` can
   * fall back to the size context and then the configured preset default.
   */
  // See `KjVariant.kjVariant` for why the field type is annotated explicitly
  // and why unset (empty string included) stays `undefined`.
  readonly kjSize: InputSignalWithTransform<string | undefined, string | undefined> = input(
    undefined as string | undefined,
    { transform: (v?: string) => v || undefined },
  );

  /**
   * The size actually reflected to `data-size`:
   * explicit input > fallback context > preset default.
   */
  readonly resolvedSize: Signal<string> = computed(
    () => this.kjSize() || this.fallback?.() || this.preset.default,
  );

  constructor() {
    if (kjDevMode()) {
      effect(() => {
        const v = this.resolvedSize();
        if (!this.preset.values.includes(v)) {
          kjDevWarn(
            'kjSize',
            `unknown size "${v}". Allowed values: ${this.preset.values.join(', ')}.`,
          );
        }
      });
    }
  }
}
