import { Directive, inject } from '@angular/core';
import { KJ_SPEED_DIAL, type KjSpeedDialContext } from './speed-dial.context';

/**
 * Action cluster container for a Speed Dial.
 *
 * Holds `role="menu"` and is hidden from the AT tree (and from layout via the
 * styled wrapper's CSS) when the dial is collapsed. Reflects `id`,
 * `data-direction`, `data-expanded` and `aria-hidden` for the wrapper to key
 * its layout / animation off of.
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name speed-dial
 */
@Directive({
  selector: '[kjSpeedDialActions]',
  standalone: true,
  exportAs: 'kjSpeedDialActions',
  host: {
    role: 'menu',
    '[id]': 'ctx.contentId',
    '[attr.data-direction]': 'ctx.direction()',
    '[attr.data-expanded]': 'ctx.expanded() ? "" : null',
    '[attr.aria-hidden]': 'ctx.expanded() ? null : "true"',
  },
})
export class KjSpeedDialActions {
  /** @internal */
  readonly ctx = inject<KjSpeedDialContext>(KJ_SPEED_DIAL);
}
