import { Directive } from '@angular/core';

/**
 * Optional decorative arrow rendered inside `[kjTooltipContent]`.
 *
 * Pure styling hook — has no behaviour. The wrapper / consumer CSS reads
 * `data-side` from the parent `[kjTooltipContent]` to position and rotate
 * the arrow. `aria-hidden="true"` keeps it out of the AT tree.
 *
 * @example
 * ```html
 * <ng-template #tip>
 *   <div kjTooltipContent>
 *     Save to disk
 *     <span kjTooltipArrow></span>
 *   </div>
 * </ng-template>
 * ```
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjTooltipArrow]',
  standalone: true,
  host: {
    'aria-hidden': 'true',
    'data-kj-tooltip-arrow': '',
  },
})
export class KjTooltipArrow {}
