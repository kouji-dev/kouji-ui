import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import {
  KJ_CHAT_CONFIG,
  KjChatAnnouncer,
  KjChatLog,
  type KjChatItemInput,
  type KjChatMessageData,
  type KjChatRenderer,
  type KjChatStore,
} from '@kouji-ui/core';
import { KjChatMessage } from './chat-message';

/**
 * The AI thread surface: a scrollable message log driven by a {@link KjChatStore}.
 *
 * **Reuses `KjChatLog`** (core) for the `role="log"` message-log container, but
 * sets `kjChatLogLive="off"` because streamed tokens mutate an *existing*
 * message node — announcing every mutation would spam AT. Instead a single
 * dedicated **visually-hidden `aria-live="polite"` region** carries
 * announcements, fed by {@link KjChatAnnouncer}'s **coalescer** so the reply is
 * announced as whole sentences (never char-by-char, never duplicated). This is
 * the kit's accessibility differentiator.
 *
 * Provider-agnostic: pair with `KjPromptInput` and drive `KjChatStore` from any
 * model / stream — the kit ships **no** LLM SDK or backend.
 *
 * @doc-example Custom thread items
 *   `provideKjChat` maps an item `type` to a component, so a thread can render
 *   turns the kit knows nothing about. Ordinary messages are untouched.
 *   @doc-file ai-chat.custom-items.example.ts
 * @doc-example Streaming (simulated)
 *   A full send → simulated-stream → reply loop with slash commands, a Stop
 *   button, tool-call cards and citations. No backend — a fake token generator
 *   feeds the store on a timer.
 *   @doc-file ai-chat.example.ts
 *
 * @doc-keyboard
 *   Enter        — Send the message
 *   Shift+Enter  — Insert a newline
 *   Esc          — Stop generating (while streaming) / close the slash menu
 *   ArrowUp/Down — Move the slash-command selection
 *
 * @doc-aria
 *   role       — `log` on the thread container (reuses `KjChatLog`)
 *   aria-live  — `off` on the visible log; a dedicated visually-hidden
 *                `polite` region carries coalesced sentence announcements
 *   article    — each message is an `article` (via `KjChat`) named by its role
 *
 * @doc-a11y
 *   Streaming replies are announced by a coalesced polite live region on
 *   sentence boundaries — never char-by-char — so screen-reader users hear
 *   whole sentences once each. Keyboard send/stop, reduced-motion typing dots,
 *   and ≥44px controls complete the AAA story.
 *
 * @doc-related chat,command-palette,textarea
 *
 * @doc-category Library/AI
 * @doc
 * @doc-name ai-chat
 * @doc-is-main
 * @doc-description Provider-agnostic AI chat thread with streaming append, coalesced live-region announcements, slash commands, tool-call cards, and citations.
 */
@Component({
  selector: 'kj-chat-thread',
  standalone: true,
  imports: [KjChatLog, KjChatMessage, NgComponentOutlet],
  providers: [KjChatAnnouncer],
  template: `
    <div #log kjChatLog kjChatLogLive="off" class="kj-chat-thread" [kjChatLogLabel]="kjLabel()">
      @for (m of store().messages(); track m.id) {
        @if (rendererFor(m); as renderer) {
          <ng-container
            *ngComponentOutlet="renderer; inputs: { item: itemFor(m), message: m }"
          ></ng-container>
        } @else {
          <kj-chat-message [message]="m" />
        }
      }
    </div>

    <!-- Coalesced polite announcer: whole sentences, debounced by boundary. -->
    <div class="kj-visually-hidden" aria-live="polite" aria-atomic="false">
      {{ announcer.message() }}
    </div>
  `,
  styleUrl: './chat-ai.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-chat-thread-host' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjChatThread {
  /** The store driving this thread. */
  readonly store = input.required<KjChatStore>();
  /** Accessible label for the log landmark. */
  readonly kjLabel = input<string | undefined>('Conversation');

  /** @internal — the coalescing announcer for the polite live region. */
  readonly announcer = inject(KjChatAnnouncer);

  private readonly config = inject(KJ_CHAT_CONFIG);

  /**
   * The registered component for a message's `type`, or `null` to let the
   * built-in renderer draw it. A message with no `type` never consults the
   * registry — that is the overwhelmingly common case and must stay free.
   *
   * An unknown `type` falls back to the configured `fallback`, and failing
   * that to the built-in renderer: a transcript that silently drops a turn is
   * worse than one that renders it plainly.
   */
  protected rendererFor(message: KjChatMessageData): KjChatRenderer | null {
    if (!message.type) return null;
    return this.config.renderers[message.type] ?? this.config.fallback ?? null;
  }

  /** The neutral shape handed to a registered renderer's `item` input. */
  protected itemFor(message: KjChatMessageData): KjChatItemInput {
    return {
      id: message.id,
      type: message.type,
      role: message.role,
      data: message.data ?? message.content,
    };
  }

  private readonly injector = inject(Injector);
  private readonly logEl = viewChild.required<ElementRef<HTMLElement>>('log');

  private lastId: string | null = null;
  private lastLen = 0;
  private prevStatus: string | null = null;

  constructor() {
    // Feed streamed deltas into the coalescer and manage flush/error/scroll.
    effect(() => {
      const store = this.store();
      const msgs = store.messages();
      const sid = store.streamingId();
      const status = store.status();

      untracked(() => {
        // New stream started — reset the delta cursor.
        if (sid !== this.lastId) {
          this.lastId = sid;
          this.lastLen = 0;
        }

        // Push the newly-arrived text delta to the coalescer.
        if (sid) {
          const m = msgs.find((x) => x.id === sid);
          if (m) {
            const delta = m.content.slice(this.lastLen);
            this.lastLen = m.content.length;
            if (delta) this.announcer.push(delta);
          }
        }

        // Status transitions: flush remainder on completion, announce errors.
        if (this.prevStatus === 'streaming' && status !== 'streaming') {
          this.announcer.flush();
          if (status === 'error') this.announcer.announce('Response failed.');
        }
        this.prevStatus = status;

        this.scrollToBottom();
      });
    });
  }

  private scrollToBottom(): void {
    afterNextRender(
      () => {
        const el = this.logEl().nativeElement;
        el.scrollTop = el.scrollHeight;
      },
      { injector: this.injector },
    );
  }
}
