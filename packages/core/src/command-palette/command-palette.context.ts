import { InjectionToken, type Signal, type WritableSignal } from '@angular/core';

/**
 * Registration record for a command item. Created by `KjCommandItem` on init
 * and passed to `KjCommandPalette` via DI-based registration.
 */
export interface KjCommandItemRegistration {
  /** Auto-generated stable id (`kj-command-item-{n}`). */
  readonly id: string;
  /** Value emitted on activation. Falls back to `el.textContent` if undefined. */
  readonly value: unknown;
  /** Whether the item is disabled. */
  readonly disabled: Signal<boolean>;
  /** The host element. */
  readonly el: HTMLElement;
  /** Filter haystacks: text content + `kjKeywords`. */
  readonly haystacks: Signal<readonly string[]>;
  /** Filter score — updated on each filter pass. */
  readonly score: WritableSignal<number>;
}

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
  readonly visibleItems: Signal<readonly KjCommandItemRegistration[]>;
  /** Auto-generated id for the listbox host element. */
  readonly listId: string;
  /** Whether the palette is in a loading state. */
  readonly loading: Signal<boolean>;

  /** Activate the item with the given value (runs the activation flow). */
  activate(value: unknown): void;
  /** Move the active descendant by `delta` positions within the visible items. Wraps. */
  moveActive(delta: number): void;
  /** Jump the active descendant to the first or last visible item. */
  setActiveTo(target: 'first' | 'last'): void;
  /** Register a command item. Called from `KjCommandItem` on init. */
  registerItem(item: KjCommandItemRegistration): void;
  /** Unregister a command item. Called from `KjCommandItem` on destroy. */
  unregisterItem(item: KjCommandItemRegistration): void;
  /** Update the query from the input. */
  setQuery(q: string): void;
  /**
   * Set the active item to a specific value without firing the activation event.
   * Used for hover highlighting.
   */
  setActiveValue(value: unknown): void;
}

/** Injection token for the `KjCommandPaletteContext`. */
export const KJ_COMMAND_PALETTE = new InjectionToken<KjCommandPaletteContext>('KjCommandPalette');

let _itemIdCounter = 0;
/** Allocate a stable command item id. */
export function nextCommandItemId(): string {
  return `kj-command-item-${++_itemIdCounter}`;
}

let _listIdCounter = 0;
/** Allocate a stable command list id. */
export function nextCommandListId(): string {
  return `kj-command-list-${++_listIdCounter}`;
}
