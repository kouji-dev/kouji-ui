import { Directive, computed, inject, input } from '@angular/core';
import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_CHAT } from './chat.context';
import { KJ_CHAT_BUBBLE_CONFIG } from './config';

/**
 * The rounded message body. Composes `KjVariant` + `KjSize` via
 * `hostDirectives` so theme CSS can paint per-message register
 * (`primary` for "your" messages, `default` for theirs, `info` / `success` /
 * `warning` / `error` for system or status, `accent` for highlighted) and
 * density (`sm` / `md` / `lg`).
 *
 * Owns the **tail** via the `data-tail` host attribute — present when
 * `kjChatBubbleNoTail` is false **and** the parent row is not grouped (the
 * tail belongs only to the first message in a same-sender run). CSS draws
 * the tail with a `::before` pseudo and reads `data-side` from the row to
 * place it on the correct corner.
 *
 * @example
 * ```html
 * <p kjChatBubble kjVariant="primary" kjSize="md">Reply text</p>
 * ```
 * @category Core/Data display
 * @doc
 * @doc-name chat
 */
@Directive({
  selector: '[kjChatBubble]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  providers: [...bindPresets(KJ_CHAT_BUBBLE_CONFIG)],
  host: {
    '[attr.data-tail]': 'showTail() ? "" : null',
  },
})
export class KjChatBubble {
  private readonly row = inject(KJ_CHAT, { optional: true });

  /** Suppresses the tail unconditionally. Auto-suppression on grouped rows is independent. */
  readonly kjChatBubbleNoTail = input(false);

  /** True when the tail should render. */
  readonly showTail = computed(
    () => !this.kjChatBubbleNoTail() && !(this.row?.grouped() ?? false),
  );
}
