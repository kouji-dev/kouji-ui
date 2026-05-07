/**
 * Predefined mask templates for common use cases.
 *
 * These are convenience string constants — not DI tokens, not hardcoded
 * into the directive. Use them as `[kjMask]="presets.phoneUS"` or spread
 * and extend per your app's locale needs.
 *
 * @example
 * ```ts
 * import { KJ_INPUT_MASK_PRESETS } from '@kouji-ui/core';
 *
 * @Component({ template: `<input kjInputMask [kjMask]="presets.phoneUS" />` })
 * export class MyForm {
 *   readonly presets = KJ_INPUT_MASK_PRESETS;
 * }
 * ```
 */
export const KJ_INPUT_MASK_PRESETS = {
  phoneUS: '(999) 999-9999',
  cardNumber: '9999 9999 9999 9999',
  cardExpiry: '99/99',
  isoDate: '9999-99-99',
  usDate: '99/99/9999',
} as const;
