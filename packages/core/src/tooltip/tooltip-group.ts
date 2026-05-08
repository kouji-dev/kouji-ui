import { Directive, output } from '@angular/core';

/**
 * Coordinates "skip-delay" timing between sibling tooltips.
 *
 * **Note (overlay primitives migration):** The skip-delay coordination
 * context was removed during the overlay-primitives migration; this
 * directive is currently a no-op marker that preserves the public selector
 * and analytics outputs. Re-instating coordinated open delays is a
 * follow-up — track via the trigger-event strategy on `KjTooltipTrigger`.
 *
 * @example
 * ```html
 * <div kjTooltipGroup>
 *   <button kjButton [kjTooltip]="'Bold'">B</button>
 *   <button kjButton [kjTooltip]="'Italic'">I</button>
 * </div>
 * ```
 *
 * @category Core/Overlay
 */
@Directive({
  selector: '[kjTooltipGroup]',
  standalone: true,
  exportAs: 'kjTooltipGroup',
})
export class KjTooltipGroup {
  /** Fires whenever any tooltip in this group opens. Convenience analytics hook. */
  readonly kjTooltipOpened = output<void>();
  /** Fires whenever any tooltip in this group closes. Convenience analytics hook. */
  readonly kjTooltipClosed = output<void>();
}
