import { InjectionToken, type Signal } from '@angular/core';
import type { KjListItem } from '../primitives/list';
import type { KjListNavigator } from '../primitives/list';

/**
 * Context interface provided by `KjCommandPalette` and consumed by child
 * directives (`KjCommandInput`, `KjCommandList`, `KjCommandItem`, etc.).
 */
export interface KjCommandPaletteContext {
  /** Current query text. */
  readonly query: Signal<string>;
  /** The active item's value (highlighted, not committed). */
  readonly activeValue: Signal<unknown>;
  /** Items visible after the current filter pass. */
  readonly visibleItems: Signal<readonly KjListItem<unknown>[]>;
  /** Auto-generated id for the listbox host element. */
  readonly listId: string;
  /** Whether the palette is in a loading state. */
  readonly loading: Signal<boolean>;
  /** Currently active item id (for aria-activedescendant). Null when nothing active. */
  readonly activeId: Signal<string | null>;

  /** Activate the item with the given value (runs the activation flow). */
  activate(value: unknown): void;
  /** Update the query from the input. */
  setQuery(q: string): void;

  /** @internal — set by `KjCommandInput`'s lifecycle. */
  _setNavigator(n: KjListNavigator | null): void;
}

/** Injection token for the `KjCommandPaletteContext`. */
export const KJ_COMMAND_PALETTE = new InjectionToken<KjCommandPaletteContext>('KjCommandPalette');

let _listIdCounter = 0;
/** Allocate a stable command list id. */
export function nextCommandListId(): string {
  return `kj-command-list-${++_listIdCounter}`;
}
