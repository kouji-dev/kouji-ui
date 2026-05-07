import { InjectionToken, Signal } from '@angular/core';

/**
 * Public context exposed by `KjMultiSelect` to its descendants —
 * trigger, listbox, options, and the optional select-all toolbar button.
 *
 * Multi Select holds an array of selected values (`readonly unknown[]`).
 * Toggling an option does **not** close the panel; closing is an explicit
 * gesture (Escape, outside-click, or `hide()` / `kjMultiSelectHideOnSelect`).
 */
export interface KjMultiSelectContext {
  /** Currently selected values (selection set, in registration order). */
  readonly value: Signal<readonly unknown[]>;
  /** Whether the listbox panel is open. */
  readonly open: Signal<boolean>;
  /** Whether the trigger is in readonly mode (panel cannot open; chips cannot remove). */
  readonly readonly: Signal<boolean>;
  /** Whether the directive (and trigger) is disabled. */
  readonly disabled: Signal<boolean>;
  /** Compare function used to detect equality between values. */
  readonly compareWith: Signal<(a: unknown, b: unknown) => boolean>;
  /**
   * Maximum allowed selection count. `Infinity` means uncapped. When set,
   * additional `select(...)` / `toggle(...)` calls beyond the cap are
   * dropped silently (still announce-safe).
   */
  readonly maxSelections: Signal<number>;
  /** Stable DOM id for the listbox panel (used for aria-controls). */
  readonly panelId: string;
  /** Filter / search query string (consumed by `KjMultiSelectOption` for matching). */
  readonly query: Signal<string>;
  /** Whether the search filter is enabled. */
  readonly searchEnabled: Signal<boolean>;
  /** All registered (and enabled) option values. Used by select-all and the empty-state. */
  readonly registeredValues: Signal<readonly unknown[]>;

  /** Toggle a single value. Does not close the panel. */
  toggle(value: unknown): void;
  /** Add a single value (no-op if already selected, or if the cap is reached). */
  select(value: unknown): void;
  /** Remove a single value (no-op if not selected). */
  deselect(value: unknown): void;
  /** Whether `value` is currently selected. */
  isSelected(value: unknown): boolean;
  /** Replace the entire selection set. Order is preserved as given. */
  setSelection(values: readonly unknown[]): void;
  /** Toggle every (non-disabled) registered value. Selects all when none/some, clears when all. */
  toggleAll(): void;
  /** Clear all selections. */
  clear(): void;
  /** Update the search query. */
  setQuery(query: string): void;

  /** Open the listbox. */
  show(): void;
  /** Close the listbox. */
  hide(): void;
  /** Toggle open/closed. */
  toggleOpen(): void;

  /** Register an option's value with the host. Returns an unregister thunk. */
  registerOption(value: unknown, disabled: () => boolean): () => void;
}

/** Injection token providing the parent `KjMultiSelect` to descendants. */
export const KJ_MULTI_SELECT = new InjectionToken<KjMultiSelectContext>(
  'KjMultiSelect',
);
