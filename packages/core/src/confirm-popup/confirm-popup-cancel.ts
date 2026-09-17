import { Directive } from '@angular/core';
import {
  KJ_CONFIRM_POPUP,
} from './confirm-popup.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

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
 * @doc-category Core/Overlay
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
  protected readonly ctx = injectParent(KJ_CONFIRM_POPUP, { child: 'KjConfirmPopupCancel', parent: '[kjConfirmPopup]' });

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.ctx.close(false);
  }
}
