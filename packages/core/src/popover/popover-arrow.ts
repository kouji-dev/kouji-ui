import { Directive, inject } from '@angular/core';
import { KJ_POPOVER, type KjPopoverContext } from './popover.context';

/**
 * Optional decorative arrow rendered inside `[kjPopoverContent]`.
 *
 * Pure styling hook — has no behaviour. Reflects the parent context's
 * `data-side` for CSS rotation. `aria-hidden="true"` keeps it out of the AT
 * tree (matching the `aria-hidden` host attribute on
 * {@link import('../tooltip/tooltip-arrow').KjTooltipArrow}).
 *
 * @example
 * ```html
 * <ng-template kjPopoverContent>
 *   <h3 kjPopoverTitle>Profile</h3>
 *   <span kjPopoverArrow></span>
 * </ng-template>
 * ```
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjPopoverArrow]',
  standalone: true,
  host: {
    'aria-hidden': 'true',
    'data-kj-popover-arrow': '',
    '[attr.data-side]': 'ctx.kjPopoverSide()',
  },
})
export class KjPopoverArrow {
  protected readonly ctx = inject<KjPopoverContext>(KJ_POPOVER);
}
