import { Directive, InjectionToken, effect, inject, input, isDevMode } from '@angular/core';

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
 * Internal preset directive composed via `hostDirectives` by every stylistic
 * component to expose a configurable `size` input that reflects to a
 * `data-size` host attribute. App code does not import this directly.
 *
 * @internal
 */
@Directive({
  selector: '[kjSize]',
  standalone: true,
  host: { '[attr.data-size]': 'kjSize()' },
})
export class KjSize {
  private readonly preset = inject(KJ_SIZE_PRESET);

  readonly kjSize = input<string, string | undefined>(this.preset.default, {
    transform: (v: string | undefined) => v || this.preset.default,
  });

  constructor() {
    if (isDevMode()) {
      effect(() => {
        const v = this.kjSize();
        if (!this.preset.values.includes(v)) {
          console.warn(
            `[kj] unknown size "${v}". Allowed values: ${this.preset.values.join(', ')}.`,
          );
        }
      });
    }
  }
}
