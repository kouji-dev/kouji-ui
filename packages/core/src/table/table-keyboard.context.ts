import { InjectionToken, type Signal } from '@angular/core';

/**
 * Contract a grid's keyboard-navigation owner exposes to its cells. Cells read
 * `tabStopId()` to learn which one of them is the grid's single Tab stop and
 * call `setActive()` when they receive focus, so the Tab stop follows the
 * user's last position (WAI-ARIA roving tabindex).
 */
export interface KjTableKeyboardNavContext {
  /** Id of the cell that owns `tabindex="0"`, or `null` while no cell is rendered. */
  readonly tabStopId: Signal<string | null>;
  /** Record the cell the user last focused. @param cellId TanStack `cell.id`. */
  setActive(cellId: string): void;
}

/** Context token provided by `KjTableKeyboardNav` and injected by `KjTableCell`. */
export const KJ_TABLE_KEYBOARD_NAV = new InjectionToken<KjTableKeyboardNavContext>(
  'KjTableKeyboardNav',
);
