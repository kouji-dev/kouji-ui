import { InjectionToken, Signal } from '@angular/core';
import type { KjListNavigator } from '../primitives/list';

/**
 * Shared state contract between [kjCombobox] root, [kjComboboxInput],
 * [kjComboboxListbox] and [kjComboboxOption].
 *
 * Provided through DI by [kjCombobox] and consumed by every sibling
 * directive. Mirrors the {@link KjSelectContext} shape but adds the
 * combobox-specific surface: query state, filter outcome (per-option
 * visibility), free-text mode, loading state, and active-descendant
 * tracking for `aria-activedescendant` on the input.
 */
export interface KjComboboxContext {
  /** Currently committed value (or `null`). */
  value: Signal<unknown>;
  /** Live query string typed into the input. */
  query: Signal<string>;
  /** Whether the listbox is open. */
  open: Signal<boolean>;
  /** Whether `kjLoading` is true (consumer-driven async fetch). */
  loading: Signal<boolean>;
  /** Whether free-text values (typed strings not in the option set) are allowed. */
  allowFreeText: Signal<boolean>;
  /** Whether the directive should run its built-in filter. `false` for async. */
  shouldFilter: Signal<boolean>;
  /** id of the currently active descendant option (for `aria-activedescendant`). */
  activeId: Signal<string | null>;
  /** Stable id used as `aria-controls` on the input and `id` on the listbox. */
  listboxId: string;
  /** Trigger / anchor element (the input). */
  inputElement: Signal<HTMLElement | null>;
  /** Number of currently *visible* (matching) options. */
  visibleCount: Signal<number>;

  /** Update the query and (optionally) open the listbox. */
  setQuery(value: string): void;
  /** Set a value (committing a selection) and close the listbox. */
  select(value: unknown): void;
  /** Show the listbox. */
  show(): void;
  /** Hide the listbox. */
  hide(): void;
  /** Toggle open / close. */
  toggle(): void;
  /** Move the active option down (`+1`) or up (`-1`), wrapping. */
  move(delta: 1 | -1): void;
  /** Commit the currently active option (if any). When free-text + no active option, commits the query. */
  commitActive(): void;
  /** @internal — record the input element so listbox can anchor to it. */
  setInputElement(el: HTMLElement | null): void;
  /** @internal — set / clear the navigator reference owned by KjComboboxInput. */
  _setNavigator(n: KjListNavigator | null): void;
}

export const KJ_COMBOBOX = new InjectionToken<KjComboboxContext>('KjCombobox');

/** Default substring filter — case-insensitive contains match. */
export const kjContainsFilter = (query: string, label: string): boolean => {
  if (!query) return true;
  return label.toLowerCase().includes(query.toLowerCase());
};

/** Case-insensitive prefix match. */
export const kjStartsWithFilter = (query: string, label: string): boolean => {
  if (!query) return true;
  return label.toLowerCase().startsWith(query.toLowerCase());
};
