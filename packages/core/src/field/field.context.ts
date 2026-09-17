import { InjectionToken, Signal } from '@angular/core';

/**
 * Shared context exposed by `KjField` to its label, help, error, and
 * registered control children. Children inject this via `KJ_FIELD` and react
 * to its signals; they never reach into the root directive directly.
 */
export interface KjFieldContext {
  /** The id of the labelled control. Auto-minted when missing. */
  readonly controlId: Signal<string>;
  /** The id of the field's `<label>` element. */
  readonly labelId: Signal<string>;
  /**
   * Whether a `[kjFieldLabel]` is actually rendered, so `labelId` names a live
   * element. A control that associates by `aria-labelledby` (anything that is
   * not a labelable element — `<div kjInputOtp role="group">`) must check this:
   * `labelId` is minted eagerly, and pointing `aria-labelledby` at an id
   * nothing carries leaves the control unnamed AND dangling.
   */
  readonly labelRendered: Signal<boolean>;
  /** Whether the registered control is required (mirrored from validators / `kjRequired`). */
  readonly required: Signal<boolean>;
  /** Whether the field is disabled (forwarded to the inner control). */
  readonly disabled: Signal<boolean>;
  /** Whether the registered control is currently in error state. */
  readonly invalid: Signal<boolean>;
  /** Ordered, deduplicated ids of all visible help + error elements. */
  readonly describedByIds: Signal<readonly string[]>;

  /** Register a help / error element so its id participates in the
   * `aria-describedby` chain. Returns a deregister callback. */
  registerDescribedBy(id: string, kind: 'help' | 'error'): () => void;

  /** Register a rendered `[kjFieldLabel]`. Returns a deregister callback. */
  registerLabel(): () => void;
}

/** Injection token for {@link KjFieldContext}. */
export const KJ_FIELD = new InjectionToken<KjFieldContext>('KjField');
