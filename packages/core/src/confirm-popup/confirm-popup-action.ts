import { Directive } from '@angular/core';
import {
  KJ_CONFIRM_POPUP,
} from './confirm-popup.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * The confirm action button slot. Click resolves the popup with `true`,
 * emitting `(kjConfirmed)` on the parent `[kjConfirmPopup]`.
 *
 * Reflects the parent context's `destructive` flag via `data-destructive`
 * so the styled wrapper can switch the button colour token / focus ring
 * with a single attribute selector.
 *
 * @example
 * ```html
 * <button kjConfirmPopupAction>Delete</button>
 * ```
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjConfirmPopupAction]',
  standalone: true,
  exportAs: 'kjConfirmPopupAction',
  host: {
    'data-kj-confirm-popup-action': '',
    '[attr.data-destructive]': 'ctx.destructive() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class KjConfirmPopupAction {
  protected readonly ctx = injectParent(KJ_CONFIRM_POPUP, { child: 'KjConfirmPopupAction', parent: '[kjConfirmPopup]' });

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.ctx.close(true);
  }
}
