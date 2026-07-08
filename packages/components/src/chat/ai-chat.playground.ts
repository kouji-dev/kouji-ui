import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { KjChatStore, type KjChatMessageData } from '@kouji-ui/core';
import { KjChatThread } from './chat-thread';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes how many seeded turns the
 * thread shows, whether the assistant is mid-reply (typing indicator), and the
 * log's accessible label.
 */
const messageCount = signal<2 | 4>(4);
const typing = signal(false);
const label = signal('Assistant conversation');

/** Seeded conversation history — a provider-agnostic, static demo transcript. */
const SEED: readonly KjChatMessageData[] = [
  { id: 'pg-1', role: 'user', content: 'How do I make a streaming chat accessible?' },
  {
    id: 'pg-2',
    role: 'assistant',
    content:
      'Announce replies on **sentence boundaries** via a single coalesced polite live region, so screen readers hear whole sentences once each — never char-by-char.',
  },
  { id: 'pg-3', role: 'user', content: 'What about the visible message log?' },
  {
    id: 'pg-4',
    role: 'assistant',
    content: 'Keep it `aria-live="off"` — the dedicated announcer carries the updates instead.',
  },
];

@Component({
  selector: 'kj-ai-chat-playground',
  standalone: true,
  imports: [KjChatThread],
  providers: [KjChatStore],
  styles: [
    `
      kj-chat-thread .kj-chat-thread {
        max-height: 22rem;
      }
    `,
  ],
  template: ` <kj-chat-thread [store]="store" [kjLabel]="label()" /> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAiChatPlaygroundDemo {
  protected readonly store = inject(KjChatStore);
  protected readonly label = label;

  constructor() {
    // Rebuild the thread whenever the seeded-turn count or typing flag changes.
    // Store mutations are wrapped in `untracked` so writing the store's signals
    // doesn't feed back into this effect.
    effect(() => {
      const count = messageCount();
      const isTyping = typing();
      untracked(() => {
        this.store.setMessages(SEED.slice(0, count));
        // An in-flight assistant message with empty content renders the
        // reduced-motion typing dots (role="status", "Assistant is typing").
        if (isTyping) this.store.beginAssistant('');
      });
    });
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjAiChatPlaygroundDemo,
  state: {
    messageCount: messageCount as unknown as ReturnType<typeof signal>,
    typing: typing as unknown as ReturnType<typeof signal>,
    label: label as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'messageCount', label: 'turns', options: [2, 4] },
    { kind: 'toggle', name: 'typing', label: 'assistant typing' },
    { kind: 'text', name: 'label', label: 'log label' },
  ],
  snippet: (values) => {
    const s = values as { messageCount: number; typing: boolean; label: string };
    const seeded = `store.setMessages(history.slice(0, ${s.messageCount}));`;
    const stream = s.typing ? `\nstore.beginAssistant(''); // typing indicator` : '';
    return `// ${seeded}${stream}\n<kj-chat-thread [store]="store" kjLabel="${s.label}" />`;
  },
};
