import { Directive, inject } from '@angular/core';
import {
  KJ_CONFIRM_POPUP,
  type KjConfirmPopupContext,
} from './confirm-popup.context';

/**
 * Marks the body / message element inside the confirm popup. Sets the host
 * `id` to the context's `messageId` so `[kjConfirmPopupContent]` can wire
 * `aria-describedby` on the panel.
 *
 * **Required for accessibility.** The WAI-ARIA `alertdialog` pattern requires
 * a description; the panel's `aria-describedby` is wired to this element's
 * id via the confirm popup context.
 *
 * @example
 * ```html
 * <ng-template kjConfirmPopupContent>
 *   <p kjConfirmPopupMessage>Delete this row? This cannot be undone.</p>
 *   …
 * </ng-template>
 * ```
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjConfirmPopupMessage]',
  standalone: true,
  host: {
    '[attr.id]': 'ctx.messageId',
  },
})
export class KjConfirmPopupMessage {
  protected readonly ctx = inject<KjConfirmPopupContext>(KJ_CONFIRM_POPUP);
}
