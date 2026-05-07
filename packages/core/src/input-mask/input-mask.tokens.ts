import { InjectionToken } from '@angular/core';

/**
 * Default token alphabet for `KjInputMask`.
 *
 * | Token | Matches |
 * |-------|---------|
 * | `9`   | digit `[0-9]` |
 * | `a`   | letter `[A-Za-z]` |
 * | `*`   | alphanumeric `[A-Za-z0-9]` |
 *
 * Override app-wide by providing `KJ_INPUT_MASK_TOKENS` in `bootstrapApplication`:
 * ```ts
 * provideKjInputMaskTokens({ ...defaultTokens, 'H': /[0-9A-Fa-f]/ })
 * ```
 */
export const KJ_INPUT_MASK_TOKENS = new InjectionToken<Record<string, RegExp>>(
  'KjInputMaskTokens',
  {
    providedIn: 'root',
    factory: () => ({
      '9': /[0-9]/,
      'a': /[A-Za-z]/,
      '*': /[A-Za-z0-9]/,
    }),
  },
);

/** Default token map — exported for consumers who want to spread into custom maps. */
export const defaultMaskTokens: Record<string, RegExp> = {
  '9': /[0-9]/,
  'a': /[A-Za-z]/,
  '*': /[A-Za-z0-9]/,
};

/**
 * Helper to provide a custom token alphabet app-wide.
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideKjInputMaskTokens({ ...defaultMaskTokens, 'H': /[0-9A-Fa-f]/ }),
 *   ],
 * });
 * ```
 */
export function provideKjInputMaskTokens(tokens: Record<string, RegExp>) {
  return { provide: KJ_INPUT_MASK_TOKENS, useValue: tokens };
}
