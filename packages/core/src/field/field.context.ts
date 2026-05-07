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
}

/** Injection token for {@link KjFieldContext}. */
export const KJ_FIELD = new InjectionToken<KjFieldContext>('KjField');
