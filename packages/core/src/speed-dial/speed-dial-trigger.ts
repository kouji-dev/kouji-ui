import { Directive } from '@angular/core';
import { KJ_SPEED_DIAL } from './speed-dial.context';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * The floating action button that toggles the Speed Dial open/closed.
 *
 * Apply alongside `kjButton` on a native `<button>` so the trigger inherits
 * the button presets (variant, size, focus ring, capture-phase disabled
 * suppression). The trigger composes `KjOverlayTrigger`, so the dial's
 * controller owns the click toggle and registers the open dial with
 * `KjOverlayStack` — which is what makes Escape work from anywhere inside
 * the cluster, a press outside dismiss it, and focus return here on close.
 *
 * The menu-button ARIA (`aria-haspopup="menu"`, `aria-expanded`,
 * `aria-controls`) is declared here rather than inherited from
 * `KjOverlayTrigger`: `aria-controls` must name the cluster's own
 * `contentId`, and `aria-expanded` follows the dial's `expanded()` — which
 * is already `false` the instant a close starts, rather than staying `true`
 * through the fan-out animation.
 *
 * @example
 * ```html
 * <div kjSpeedDial>
 *   <button kjButton kjSpeedDialTrigger aria-label="Open actions">+</button>
 *   …
 * </div>
 * ```
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name speed-dial
 */
@Directive({
  selector: '[kjSpeedDialTrigger]',
  standalone: true,
  exportAs: 'kjSpeedDialTrigger',
  hostDirectives: [KjOverlayTrigger],
  host: {
    type: 'button',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'ctx.expanded() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.contentId',
    '[attr.data-state]': 'ctx.expanded() ? "open" : "closed"',
  },
})
export class KjSpeedDialTrigger {
  /** @internal */
  readonly ctx = injectParent(KJ_SPEED_DIAL, { child: 'KjSpeedDialTrigger', parent: '[kjSpeedDial]' });
}
