import { Directive, output } from '@angular/core';
import {
  KJ_TOOLTIP_GROUP,
  type KjTooltipGroupContext,
  createKjTooltipGroupContext,
} from './tooltip.context';

/**
 * Coordinates "skip-delay" timing between sibling tooltips.
 *
 * When one tooltip in the group is visible (or was visible within the
 * `skipDelayMs` window), moving to another tooltip in the same group opens
 * it instantly — without waiting for `kjOpenDelayMs`. The result is the
 * Radix-style "first hover takes a moment, follow-up hovers feel instant"
 * ergonomic that's standard on toolbars / icon button rows.
 *
 * If you need cross-toolbar isolation, wrap each cluster in its own
 * `[kjTooltipGroup]`. Without an explicit group, all tooltips share a
 * single global group provided in `providedIn: 'root'`.
 *
 * @example
 * ```html
 * <div kjTooltipGroup>
 *   <button kjButton [kjTooltip]="'Bold'">B</button>
 *   <button kjButton [kjTooltip]="'Italic'">I</button>
 *   <button kjButton [kjTooltip]="'Underline'">U</button>
 * </div>
 * ```
 *
 * @category Core/Overlays
 * @doc
 * @doc-name tooltip
 */
@Directive({
  selector: '[kjTooltipGroup]',
  standalone: true,
  exportAs: 'kjTooltipGroup',
  providers: [
    {
      provide: KJ_TOOLTIP_GROUP,
      useFactory: () => createKjTooltipGroupContext(),
    },
  ],
})
export class KjTooltipGroup {
  /** Fires whenever any tooltip in this group opens. Convenience analytics hook. */
  readonly kjTooltipOpened = output<void>();
  /** Fires whenever any tooltip in this group closes. Convenience analytics hook. */
  readonly kjTooltipClosed = output<void>();
}

/**
 * Re-export of the group context shape for consumers that want to subscribe
 * to it directly.
 *
 * @internal
 */
export type { KjTooltipGroupContext };
