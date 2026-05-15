import { InjectionToken, type Signal } from '@angular/core';

/**
 * Surface a `[kjMenubarItem]` exposes to its parent `[kjMenubar]`.
 *
 * Keyboard navigation, roving tabindex, type-ahead and activation are all
 * owned by the composed list primitives (`KjListNavigator` + `KjListItem`),
 * so the context's surface is intentionally small.
 */
export interface KjMenubarItemContext {
  /** The bar item's host element. */
  readonly el: HTMLElement;
  /** Whether the item is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether this item's popup is currently open. */
  readonly open: Signal<boolean>;
  /** Open this item's submenu (if it has one). */
  openPopup(): void;
  /** Close this item's submenu. */
  closePopup(): void;
}

/**
 * Context provided by `[kjMenubar]` to all descendant `[kjMenubarItem]`s.
 */
export interface KjMenubarContext {
  /** The bar item whose popup is currently open, if any. */
  readonly openItem: Signal<KjMenubarItemContext | null>;
  /** Whether ArrowLeft / Right wraps at the bar ends. */
  readonly loop: Signal<boolean>;

  /** A bar item registers itself on construction. */
  registerItem(item: KjMenubarItemContext): void;
  /** A bar item unregisters itself on destruction. */
  unregisterItem(item: KjMenubarItemContext): void;
  /** A bar item reports that its popup opened. */
  notifyItemOpened(item: KjMenubarItemContext): void;
  /** A bar item reports that its popup closed. */
  notifyItemClosed(item: KjMenubarItemContext): void;
}

/** DI token for the menubar shared context. */
export const KJ_MENUBAR = new InjectionToken<KjMenubarContext>('KjMenubar');
