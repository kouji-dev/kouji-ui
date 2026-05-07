import { InjectionToken, type Signal } from '@angular/core';
import type { KjAnchorAlign, KjAnchorSide } from '../primitives/overlay';

/** Side on which the dropdown panel is placed relative to its trigger. */
export type KjDropdownMenuSide = KjAnchorSide;

/** Cross-axis alignment of the dropdown panel. */
export type KjDropdownMenuAlign = KjAnchorAlign;

/** Reason a dropdown menu close was requested. */
export type KjDropdownMenuCloseReason =
  | 'item'
  | 'escape'
  | 'tab'
  | 'click-outside'
  | 'programmatic';

/**
 * Context shared between the dropdown menu directive family — root,
 * trigger, panel, items, separators, labels, groups.
 */
export interface KjDropdownMenuContext {
  /** Reactive open state. */
  readonly open: Signal<boolean>;
  /** Stable id for the panel element (used as `aria-controls` on the trigger). */
  readonly panelId: string;
  /** Preferred panel side (input mirror). */
  readonly side: Signal<KjDropdownMenuSide>;
  /** Preferred panel alignment (input mirror). */
  readonly align: Signal<KjDropdownMenuAlign>;
  /** Pixel offset between the trigger and the panel. */
  readonly offset: Signal<number>;
  /** Whether to keep the menu open when an item is activated. */
  readonly closeOnSelect: Signal<boolean>;
  /** The element that opened the menu — captured at open-time. */
  readonly triggerElement: Signal<HTMLElement | null>;

  /** Open the menu, optionally focusing the first / last item. */
  show(invoker: HTMLElement | null, focus: 'first' | 'last' | 'none'): void;
  /** Request a close with the given reason. */
  hide(reason: KjDropdownMenuCloseReason): void;
  /** Toggle open / closed using the supplied invoker for restore. */
  toggle(invoker: HTMLElement | null): void;
  /**
   * Read-and-clear the panel's pending auto-focus mode.
   *
   * @internal Called by `[kjDropdownMenu]` after the panel mounts.
   */
  consumePendingFocus(): 'first' | 'last' | 'none';
}

/** DI token for the dropdown menu shared context. */
export const KJ_DROPDOWN_MENU = new InjectionToken<KjDropdownMenuContext>(
  'KjDropdownMenu',
);

let _panelIdCounter = 0;
/** Allocate a stable panel id for `aria-controls` wiring. */
export function nextDropdownMenuPanelId(): string {
  return `kj-dropdown-menu-${++_panelIdCounter}`;
}

let _labelIdCounter = 0;
/** Allocate a stable label id for `aria-labelledby` wiring on a group. */
export function nextDropdownMenuLabelId(): string {
  return `kj-dropdown-menu-label-${++_labelIdCounter}`;
}
