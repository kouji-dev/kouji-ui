import { InjectionToken, type Signal } from '@angular/core';

/**
 * Context exposed by a single bar item to the parent menubar coordinator.
 *
 * The bar item registers itself in `ngOnInit`, unregisters in `ngOnDestroy`,
 * and exposes its DOM element + open / close hooks so the bar can move
 * focus and orchestrate cross-bar arrow navigation.
 */
export interface KjMenubarItemContext {
  /** The bar item's host element. */
  readonly el: HTMLElement;
  /** Whether the item is disabled (skip-on-arrow, still tabbable). */
  readonly disabled: Signal<boolean>;
  /** Whether this item's popup is currently open. */
  readonly open: Signal<boolean>;
  /** Open my popup, with the given initial focus target. */
  openPopup(focus: 'first' | 'last' | 'none'): void;
  /** Close my popup. */
  closePopup(): void;
  /** Move focus to this item. */
  focusItem(): void;
}

/**
 * Context provided by `[kjMenubar]` to all descendant `[kjMenubarItem]`s.
 *
 * Tracks the currently-open bar item, the auto-disclose mode (roll-over
 * disclosure), and surfaces the cross-bar focus / open coordination
 * primitives.
 */
export interface KjMenubarContext {
  /**
   * Auto-disclose mode is on once any popup opens; off after Esc / Tab /
   * click-outside / toggle-close.
   */
  readonly autoDiscloseActive: Signal<boolean>;
  /** The bar item whose popup is currently open, if any. */
  readonly openItem: Signal<KjMenubarItemContext | null>;
  /** Whether ArrowLeft / Right wraps at the bar ends. */
  readonly loop: Signal<boolean>;
  /** Whether auto-disclose (roll-over) is enabled at all. */
  readonly autoDiscloseEnabled: Signal<boolean>;
  /** Hover dwell delay before transferring popup ownership. */
  readonly autoDiscloseDelayMs: Signal<number>;

  /** A bar item registers itself with the bar on construction. */
  registerItem(item: KjMenubarItemContext): void;
  /** A bar item unregisters itself on destruction. */
  unregisterItem(item: KjMenubarItemContext): void;
  /** Called by a bar item when its popup opens; the bar adopts it as the openItem. */
  notifyItemOpened(item: KjMenubarItemContext): void;
  /** Called by a bar item when its popup closes; the bar clears openItem if it matches. */
  notifyItemClosed(item: KjMenubarItemContext): void;
  /** Pointer-enter notification — used to roll over to a hovered item. */
  notifyItemPointerEnter(item: KjMenubarItemContext): void;
  /** Pointer-leave notification — cancels a pending roll-over. */
  notifyItemPointerLeave(item: KjMenubarItemContext): void;

  /**
   * Move focus to the bar item adjacent to `from` by `delta` (with skip-disabled
   * + optional wrap). Optionally opens the destination's popup.
   */
  moveFocus(
    from: KjMenubarItemContext,
    delta: 1 | -1,
    opts: { openPopup: boolean; focus: 'first' | 'last' | 'none' },
  ): void;

  /** Move to the first / last non-disabled bar item. */
  moveFocusToEdge(
    edge: 'first' | 'last',
    opts: { openPopup: boolean; focus: 'first' | 'last' | 'none' },
  ): void;

  /** Type-ahead: move focus to the next bar item starting with `char`. */
  typeAhead(from: KjMenubarItemContext, char: string): void;
}

/** DI token for the menubar shared context. */
export const KJ_MENUBAR = new InjectionToken<KjMenubarContext>('KjMenubar');
