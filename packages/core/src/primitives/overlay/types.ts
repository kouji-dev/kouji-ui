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

/**
 * Why an overlay was asked to close. Set by whoever requests the close and
 * exposed as `KjOverlayController.closeReason` (and on the dialog / drawer /
 * sheet refs) so a consumer can tell a dismissal from a decision.
 *
 * - `'escape'` — the Escape key, routed by `KjOverlayStack`
 * - `'outside'` — a press outside the panel, routed by `KjOverlayStack`
 *   (overlays without a scrim)
 * - `'backdrop'` — a press on the overlay's own scrim (`<kj-backdrop>`)
 * - `'trigger'` — the trigger toggled it closed (click, hover-leave, hotkey)
 * - `'select'` — an item inside the panel was selected or activated
 * - `'tab'` — focus tabbed out of the panel
 * - `'programmatic'` — an API call (`ref.close()`, `controller.close()`)
 */
export type KjCloseReason =
  | 'escape'
  | 'outside'
  | 'backdrop'
  | 'trigger'
  | 'select'
  | 'tab'
  | 'programmatic';
