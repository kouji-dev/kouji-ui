import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
} from '@angular/core';
import { KJ_ALERT } from './alert.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Marks an element as the alert title. Generates `${alertId}-title`,
 * registers with the `KJ_ALERT` context so the root reflects
 * `aria-labelledby`. Apply to a heading element (`<h3 kjAlertTitle>`)
 * when the alert is in a content region.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'titleId',
  },
})
export class KjAlertTitle {
  private readonly ctx = injectParent(KJ_ALERT, { child: 'KjAlertTitle', parent: '[kjAlert]' });
  /** Generated id of the title element, registered for `aria-labelledby`. */
  readonly titleId = `${this.ctx.alertId()}-title`;

  constructor() {
    this.ctx.registerTitle(this.titleId);
    inject(ElementRef); // ensure host element is bound before destroy
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterTitle(this.titleId));
  }
}
