import { DestroyRef, Directive, inject } from '@angular/core';
import { KJ_CHAT, nextChatHeaderId } from './chat.context';

/**
 * Mints a stable id for the chat row's header and registers it with the
 * parent `KjChat` so the row's host `aria-labelledby` attribute references
 * the sender's name + time. Visual chrome (small font, muted colour, spacing
 * above the bubble) belongs to CSS; the directive does not paint.
 *
 * Standalone (no `KjChat` parent) the directive still mints an id but no
 * wiring fires — the consumer is responsible for the link.
 *
 * @example
 * ```html
 * <header kjChatHeader>Alice <time datetime="…">12:46</time></header>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name chat
 */
@Directive({
  selector: '[kjChatHeader]',
  standalone: true,
  host: {
    '[id]': 'id',
  },
})
export class KjChatHeader {
  private readonly chat = inject(KJ_CHAT, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Auto-generated id used for the parent row's `aria-labelledby`. */
  readonly id = nextChatHeaderId();

  constructor() {
    if (this.chat) {
      this.chat.registerHeaderId(this.id);
      this.destroyRef.onDestroy(() => this.chat?.unregisterHeaderId(this.id));
    }
  }
}
