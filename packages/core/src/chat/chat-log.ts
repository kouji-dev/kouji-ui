import { Directive, input } from '@angular/core';
import { KJ_CHAT_LOG, type KjChatLogContext } from './chat.context';

/**
 * Container for a stream of `[kjChat]` rows. Owns the live region: per APG's
 * Log pattern, the **container** announces new arrivals — never the bubble
 * itself. Default `aria-live="polite"` matches the chat-app convention; we
 * deliberately do not expose `'assertive'` (it would interrupt the user
 * mid-typing on every inbound message and is the canonical chat-app a11y bug).
 *
 * `aria-relevant="additions"` confines announcements to *new* messages so that
 * edits to existing bubbles don't re-announce the full edited content.
 *
 * @example
 * ```html
 * <div kjChatLog kjChatLogLabel="Conversation with Alice">
 *   <div kjChat kjSide="start" kjChatAuthor="alice">…</div>
 *   <div kjChat kjSide="end"   kjChatAuthor="me">…</div>
 * </div>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name chat
 */
@Directive({
  selector: '[kjChatLog]',
  standalone: true,
  providers: [{ provide: KJ_CHAT_LOG, useExisting: KjChatLog }],
  host: {
    'role': 'log',
    '[attr.aria-live]': 'kjChatLogLive()',
    '[attr.aria-relevant]': '"additions"',
    '[attr.aria-atomic]': '"false"',
    '[attr.aria-label]': 'kjChatLogLabel() ?? null',
  },
})
export class KjChatLog implements KjChatLogContext {
  /** Live-region politeness. `'polite'` (default) or `'off'`. */
  readonly kjChatLogLive = input<'polite' | 'off'>('polite');

  /** Optional `aria-label` for the log landmark. */
  readonly kjChatLogLabel = input<string | undefined>(undefined);
}
