import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { KjChatStore, type KjSlashCommand } from '@kouji-ui/core';
import { KjChatThread } from '../chat-thread';
import { KjPromptInput } from '../prompt-input';

/**
 * End-to-end AI chat example driven by a **simulated** streaming source — no
 * backend, no LLM SDK. Sending a message spawns a fake token generator that
 * pushes chunks into {@link KjChatStore} on a timer, exercising the streaming
 * append API, status transitions, the coalesced live region, tool-call cards,
 * citations, and Stop.
 */
@Component({
  selector: 'kj-ai-chat-example',
  standalone: true,
  imports: [KjChatThread, KjPromptInput],
  providers: [KjChatStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      kj-chat-thread .kj-chat-thread {
        max-height: 24rem;
      }
    `,
  ],
  template: `
    <kj-chat-thread [store]="store" kjLabel="Assistant conversation" />
    <kj-prompt-input
      [(kjValue)]="draft"
      [kjStreaming]="store.isStreaming()"
      [kjSlashCommands]="commands"
      (kjSend)="onSend($event)"
      (kjStop)="onStop()"
    />
  `,
})
export class AiChatExample {
  protected readonly store = inject(KjChatStore);
  protected draft = '';

  protected readonly commands: KjSlashCommand[] = [
    { name: '/summarize', label: 'Summarize', description: 'Condense the conversation' },
    { name: '/code', label: 'Code sample', description: 'Return a fenced code block' },
    { name: '/cite', label: 'With citations', description: 'Answer with sources' },
  ];

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Stop the simulated stream if the demo is torn down mid-reply.
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  onSend(text: string): void {
    this.store.sendUser(text);
    this.startSimulatedReply(text);
  }

  onStop(): void {
    this.clearTimer();
    this.store.stop();
  }

  private startSimulatedReply(prompt: string): void {
    const id = this.store.beginAssistant();

    const wantsCode = prompt.startsWith('/code');
    const wantsCite = prompt.startsWith('/cite');

    if (wantsCite) {
      this.store.addToolCall({ id: 't1', name: 'search_docs', status: 'running' });
    }

    const reply = wantsCode
      ? 'Here is a snippet.\n\n```ts\nconst sum = (a: number, b: number) => a + b;\n```\n\nCall it with two numbers.'
      : 'Sure! I can help with that. Streaming happens sentence by sentence, so screen readers hear whole sentences. Let me know if you need more detail.';

    const tokens = reply.match(/\S+\s*|\n/g) ?? [reply];
    let i = 0;
    this.clearTimer();
    this.timer = setInterval(() => {
      if (i < tokens.length) {
        this.store.pushChunk(tokens[i++]);
        return;
      }
      this.clearTimer();
      if (wantsCite) {
        this.store.updateToolCall('t1', { status: 'done' });
        this.store.addCitations([
          {
            id: 'c1',
            title: 'Streaming a11y guide',
            url: 'https://example.com/a11y',
            snippet: 'Coalesce announcements',
          },
          { id: 'c2', title: 'ARIA Log pattern' },
        ]);
      }
      void id;
      this.store.endAssistant();
    }, 90);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
