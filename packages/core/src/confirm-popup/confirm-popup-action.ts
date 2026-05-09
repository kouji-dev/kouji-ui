import { Directive, inject } from '@angular/core';
import {
  KJ_CONFIRM_POPUP,
  type KjConfirmPopupContext,
} from './confirm-popup.context';

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
  protected readonly ctx = inject<KjConfirmPopupContext>(KJ_CONFIRM_POPUP);

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.ctx.close(true);
  }
}
