import { InjectionToken, Signal } from '@angular/core';

/**
 * Public context exposed by `KjTag` to its descendants (notably
 * `KjTagRemove`). Mirrors the minimal surface called out in the analysis:
 * three signals + a `remove()` callback.
 */
export interface KjTagContext {
  /** Live read of the projected text content (label) for the tag. */
  readonly textContent: Signal<string>;
  /** Whether the tag is currently selected (selectable shape only). */
  readonly selected: Signal<boolean>;
  /** Whether the tag is disabled (own + inherited from `KjTagList`). */
  readonly disabled: Signal<boolean>;
  /** Triggers removal: emits the parent's `(kjTagRemoved)` output. */
  remove(): void;
}

/** Role that a `KjTagList` container exposes. Drives chip role selection. */
export type KjTagListRole = 'listbox' | 'grid' | 'group';

/** Public context exposed by `KjTagList` so nested tags can self-configure. */
export interface KjTagListContext {
  /** Active container role; chips read this to compute their own role. */
  readonly role: Signal<KjTagListRole>;
  /** Whether the entire tag list is disabled (cascades into chips). */
  readonly disabled: Signal<boolean>;
  /** Whether the listbox container allows multi-selection. */
  readonly multiple: Signal<boolean>;
}

/** Injection token providing the parent `KjTag` to projected children. */
export const KJ_TAG = new InjectionToken<KjTagContext>('KjTag');

/** Injection token providing the optional `KjTagList` container. */
export const KJ_TAG_LIST = new InjectionToken<KjTagListContext>('KjTagList');
