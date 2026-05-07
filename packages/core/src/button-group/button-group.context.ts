import { InjectionToken, Signal } from '@angular/core';

/** Layout axis for the button group. */
export type KjButtonGroupOrientation = 'horizontal' | 'vertical';

/**
 * Shared state surfaced by `KjButtonGroup` for child buttons (in the wrapper
 * package) and the wrapper template to read.
 *
 * - `orientation` drives layout / styling hooks.
 * - `variant` / `size` are *defaults* — children may override per-instance.
 * - `disabled` is OR-ed into each child's own disabled state.
 */
export interface KjButtonGroupContext {
  /** Layout axis (default `'horizontal'`). */
  readonly orientation: Signal<KjButtonGroupOrientation>;
  /** Variant token forwarded from the group as a default for children. */
  readonly variant: Signal<string | undefined>;
  /** Size token forwarded from the group as a default for children. */
  readonly size: Signal<string | undefined>;
  /** Group-level disabled flag, OR-ed into each child's own state. */
  readonly disabled: Signal<boolean>;
}

/** Injection token for `KjButtonGroupContext`. */
export const KJ_BUTTON_GROUP = new InjectionToken<KjButtonGroupContext>(
  'KjButtonGroup',
);
