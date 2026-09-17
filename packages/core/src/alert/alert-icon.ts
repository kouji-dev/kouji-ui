import {
  Directive,
} from '@angular/core';
import { KJ_ALERT } from './alert.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Decorative icon slot for an alert. Sets `aria-hidden="true"` (the
 * meaning is carried by the title/description) and mirrors the
 * resolved variant as `data-variant` so themes can swap glyphs without
 * the consumer re-typing it.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertIcon]',
  standalone: true,
  host: {
    '[attr.aria-hidden]': '"true"',
    '[attr.data-variant]': 'variant()',
  },
})
export class KjAlertIcon {
  private readonly ctx = injectParent(KJ_ALERT, { child: 'KjAlertIcon', parent: '[kjAlert]' });
  readonly variant = this.ctx.variant;
}
