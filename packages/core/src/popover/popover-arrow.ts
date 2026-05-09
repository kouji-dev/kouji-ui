import { Directive } from '@angular/core';

/**
 * Optional decorative arrow rendered inside `[kjPopoverContent]`.
 *
 * Pure styling hook — has no behaviour. Consumer CSS reads `data-side` from
 * the parent panel host (set by the position strategy) to position and
 * rotate the arrow. `aria-hidden="true"` keeps it out of the AT tree
 * (matches `KjTooltipArrow`).
 *
 * @example
 * ```html
 * <kj-popover-content [kjFor]="t">
 *   <h3 kjPopoverTitle>Profile</h3>
 *   <span kjPopoverArrow></span>
 * </kj-popover-content>
 * ```
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjPopoverArrow]',
  standalone: true,
  host: {
    'class': 'kj-popover-arrow',
    'aria-hidden': 'true',
    'data-kj-popover-arrow': '',
  },
})
export class KjPopoverArrow {}
