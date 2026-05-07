/** Side on which a floating element is placed relative to its anchor. */
export type KjSide = 'top' | 'bottom' | 'left' | 'right';

/** Alignment of the floating element along the cross-axis of its side. */
export type KjAlign = 'start' | 'center' | 'end';

/** Resolved (post-flip / post-shift) placement. */
export interface KjPlacement {
  side: KjSide;
  align: KjAlign;
}

/** Lifecycle state of an overlay. */
export type KjOverlayState = 'closed' | 'opening' | 'open' | 'closing';

/** ARIA role applied to the panel element. */
export type KjPanelRole =
  | 'dialog' | 'alertdialog'
  | 'tooltip'
  | 'menu' | 'listbox' | 'tree'
  | 'status' | 'alert';

/** Reason a close was requested. */
export type KjCloseReason = 'esc' | 'outside' | 'programmatic';
