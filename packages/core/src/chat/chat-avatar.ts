import { Directive } from '@angular/core';

/**
 * Side-edge slot for the projected sender face. The slot is **always
 * decorative** — the row's accessible name comes from the header (sender
 * name + time). Letting an `<img alt>` re-announce the name causes AT users
 * to hear "Jane Doe, Jane Doe, [message]". The directive forces
 * `aria-hidden="true"` to prevent that.
 *
 * Project a `<kj-avatar [kjDecorative]="true">` (or any decorative marker)
 * inside.
 *
 * @example
 * ```html
 * <span kjChatAvatar>
 *   <span kjAvatar>…</span>
 * </span>
 * ```
 * @category Core/Data display
 */
@Directive({
  selector: '[kjChatAvatar]',
  standalone: true,
  host: {
    'role': 'presentation',
    '[attr.aria-hidden]': '"true"',
  },
})
export class KjChatAvatar {}
