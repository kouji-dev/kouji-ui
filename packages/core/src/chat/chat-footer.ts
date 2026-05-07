import { DestroyRef, Directive, computed, inject, input } from '@angular/core';
import { KJ_CHAT, nextChatFooterId, type KjChatState } from './chat.context';

const STATE_LABEL: Readonly<Record<KjChatState, string>> = {
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  error: 'Failed to send',
};

/**
 * Mints a stable id for the chat row's footer and registers it with the
 * parent `KjChat` so the row's host `aria-describedby` references it.
 *
 * Reflects `kjState` to a `data-state` host attribute that components-package
 * CSS reads to paint a status glyph (clock / single-check / double-check /
 * filled-double-check / exclamation). Also injects an `aria-label` so the
 * description is intelligible to AT even when the glyph is the only visible
 * content.
 *
 * Free-form text ("Seen 12:46") is fine too — leave `kjState` undefined and
 * the directive renders only the consumer's projected content.
 *
 * @example
 * ```html
 * <footer kjChatFooter kjState="read">Read 12:46</footer>
 * ```
 * @category Core/Data display
 */
@Directive({
  selector: '[kjChatFooter]',
  standalone: true,
  host: {
    '[id]': 'id',
    '[attr.data-state]': 'kjState() ?? null',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class KjChatFooter {
  private readonly chat = inject(KJ_CHAT, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Auto-generated id used for the parent row's `aria-describedby`. */
  readonly id = nextChatFooterId();

  /**
   * Read / delivery state. Drives `data-state` for the glyph and an injected
   * `aria-label` for AT. When undefined, only projected content renders.
   */
  readonly kjState = input<KjChatState | undefined>(undefined);

  /** Aria label derived from `kjState`. `null` when no state is set. */
  readonly ariaLabel = computed(() => {
    const s = this.kjState();
    return s ? STATE_LABEL[s] : null;
  });

  constructor() {
    if (this.chat) {
      this.chat.registerFooterId(this.id);
      this.destroyRef.onDestroy(() => this.chat?.unregisterFooterId(this.id));
    }
  }
}
