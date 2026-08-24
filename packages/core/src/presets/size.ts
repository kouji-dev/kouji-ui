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
 * Shape of the preset configuration consumed by `KjSize`. One per consumer
 * directive, provided via `bindPresets` from a per-component config token.
 *
 * @internal
 */
export interface KjSizePreset {
  values: string[];
  default: string;
}

/**
 * DI token holding the size preset for the current consumer's injector scope.
 * Resolved by `KjSize` at construction time.
 *
 * Default factory: `{ values: ['md'], default: 'md' }`.
 *
 * @internal
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
 * @internal
 */
export const KJ_SIZE_FALLBACK = new InjectionToken<Signal<string | undefined> | null>(
  'kj.size.fallback',
);

/**
 * Internal preset directive composed via `hostDirectives` by every stylistic
 * component to expose a configurable `size` input that reflects to a
 * `data-size` host attribute. App code does not import this directly.
 *
 * The reflected value resolves as: explicit `kjSize` input, else the
 * `KJ_SIZE_FALLBACK` context (when a compound parent provides one), else
 * `KJ_SIZE_PRESET.default` (the `provideKj*`-configurable default).
 *
 * @internal
 */
@Directive({
  selector: '[kjSize]',
  standalone: true,
  host: { '[attr.data-size]': 'resolvedSize()' },
})
export class KjSize {
  private readonly preset = inject(KJ_SIZE_PRESET);
  private readonly fallback = inject(KJ_SIZE_FALLBACK, { optional: true });

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
    if (isDevMode()) {
      effect(() => {
        const v = this.resolvedSize();
        if (!this.preset.values.includes(v)) {
          console.warn(
            `[kj] unknown size "${v}". Allowed values: ${this.preset.values.join(', ')}.`,
          );
        }
      });
    }
  }
}
