import { Directive, inject } from '@angular/core';
import {
  KJ_CONFIRM_POPUP,
  type KjConfirmPopupContext,
} from './confirm-popup.context';

/**
 * The cancel action button slot. Click resolves the popup with `false`,
 * emitting `(kjCancelled)` on the parent `[kjConfirmPopup]`.
 *
 * Receives initial focus by default (configurable via the parent's
 * `kjDefaultFocus`) — WCAG 3.3.4 *Error Prevention*. Confirm popups must
 * default to the safe action.
 *
 * @example
 * ```html
 * <button kjConfirmPopupCancel>Cancel</button>
 * ```
 *
 * @category Core/Actions
 * @doc
 * @doc-name confirm-popup
 */
@Directive({
  selector: '[kjConfirmPopupCancel]',
  standalone: true,
  exportAs: 'kjConfirmPopupCancel',
  host: {
    'data-kj-confirm-popup-cancel': '',
    '(click)': 'onClick($event)',
  },
})
export class KjConfirmPopupCancel {
  protected readonly ctx = inject<KjConfirmPopupContext>(KJ_CONFIRM_POPUP);

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.ctx.close(false);
  }
}
