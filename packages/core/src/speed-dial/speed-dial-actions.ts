import { Directive } from '@angular/core';
import { KJ_SPEED_DIAL } from './speed-dial.context';
import { KjOverlayPanel } from '../primitives/overlay/panel';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Action cluster container for a Speed Dial.
 *
 * Composes {@link KjOverlayPanel}, so it is the dial's overlay panel: the
 * controller marks it as the overlay's content (a press inside it is never
 * an outside press), stamps the stack level on it, and adds `data-state`
 * plus `hidden` while the dial is closed.
 *
 * It also keeps `role="menu"`, its own `id` (the dial's `contentId`, which
 * the trigger's `aria-controls` names — this binding deliberately wins over
 * the panel's generated id), `data-direction`, `data-expanded` and
 * `aria-hidden` for the styled wrapper to key its layout and animation off.
 *
 * A stylesheet that animates the fan-out should override the `hidden`
 * attribute's `display: none` — `@kouji-ui/components` does — so the cluster
 * keeps a box to transition; the AT tree is governed by `aria-hidden` either
 * way.
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name speed-dial
 */
@Directive({
  selector: '[kjSpeedDialActions]',
  standalone: true,
  exportAs: 'kjSpeedDialActions',
  hostDirectives: [KjOverlayPanel],
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
  readonly ctx = injectParent(KJ_SPEED_DIAL, { child: 'KjSpeedDialActions', parent: '[kjSpeedDial]' });
}
