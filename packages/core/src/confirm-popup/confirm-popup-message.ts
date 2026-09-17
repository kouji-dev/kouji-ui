import { Directive } from '@angular/core';
import {
  KJ_CONFIRM_POPUP,
} from './confirm-popup.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

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
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjConfirmPopupMessage]',
  standalone: true,
  host: {
    'class': 'kj-confirm-popup-message',
    '[attr.id]': 'ctx.messageId',
  },
})
export class KjConfirmPopupMessage {
  protected readonly ctx = injectParent(KJ_CONFIRM_POPUP, { child: 'KjConfirmPopupMessage', parent: '[kjConfirmPopup]' });
}
