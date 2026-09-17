import {
  DestroyRef,
  Directive,
  inject,
} from '@angular/core';
import { KJ_ALERT } from './alert.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Marks an element as the alert description. Generates
 * `${alertId}-description`, registers with `KJ_ALERT` for
 * `aria-describedby`. Same id-registration pattern as `KjAlertTitle`.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertDescription]',
  standalone: true,
  host: {
    '[attr.id]': 'descriptionId',
  },
})
export class KjAlertDescription {
  private readonly ctx = injectParent(KJ_ALERT, { child: 'KjAlertDescription', parent: '[kjAlert]' });
  /** Generated id of the description element, registered for `aria-describedby`. */
  readonly descriptionId = `${this.ctx.alertId()}-description`;

  constructor() {
    this.ctx.registerDescription(this.descriptionId);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterDescription(this.descriptionId));
  }
}
