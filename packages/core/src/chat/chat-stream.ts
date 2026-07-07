import { Injectable, computed, signal } from '@angular/core';

/**
 * Role of an AI-thread message. Distinct from {@link KjChatRole} in
 * `chat.context.ts` (that type is an ARIA role for the chat-bubble kit); this
 * one models the LLM conversation roles.
 */
export type KjChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

/** High-level stream status of the thread. */
export type KjChatStatus = 'idle' | 'streaming' | 'error';

/** A source reference attached to an assistant message. */
export interface KjChatCitation {
  /** Stable id (used as the list key and `aria` target). */
  readonly id: string;
  /** Human-readable title of the source. */
  readonly title: string;
  /** Optional link to the source. */
  readonly url?: string;
  /** Optional supporting snippet. */
  readonly snippet?: string;
}

/** Lifecycle status of a tool call. */
export type KjChatToolStatus = 'pending' | 'running' | 'done' | 'error';

/** A tool / function call surfaced inside an assistant turn. */
export interface KjChatToolCall {
  /** Stable id. */
  readonly id: string;
  /** Tool / function name. */
  readonly name: string;
  /** Serialised arguments (opaque to the kit). */
  readonly args?: unknown;
  /** Lifecycle status. */
  readonly status: KjChatToolStatus;
  /** Result payload once resolved. */
  readonly result?: unknown;
  /** Error message when `status === 'error'`. */
  readonly error?: string;
}

/** A single message in an AI thread. */
export interface KjChatMessageData {
  /** Stable id. */
  readonly id: string;
  /** Conversation role. */
  readonly role: KjChatMessageRole;
  /** Message text (may be partial while streaming). */
  readonly content: string;
  /** True while this (assistant) message is being streamed in. */
  readonly streaming?: boolean;
  /** Error text if this turn failed. */
  readonly error?: string | null;
  /** Tool calls surfaced during this turn. */
  readonly toolCalls?: readonly KjChatToolCall[];
  /** Citations attached to this turn. */
  readonly citations?: readonly KjChatCitation[];
  /** Creation timestamp (epoch ms). */
  readonly createdAt?: number;
}

let _msgId = 0;
/** Allocate a stable message id. */
export function nextChatMessageId(): string {
  return `kj-msg-${++_msgId}`;
}

/**
 * Headless, **provider-agnostic** streaming chat state.
 *
 * Owns the `messages` signal, the stream `status`, and the append API. It has
 * **no** LLM SDK, `fetch`, or backend — the consumer wires their own model /
 * stream and drives this store: `sendUser()`, `beginAssistant()`, then
 * `pushChunk()` per token/chunk, and finally `endAssistant()` (or `fail()` /
 * `stop()`).
 *
 * Provided **per thread** (no `providedIn`); `KjChatThread` provides one, or
 * the consumer provides their own to share state.
 *
 * @example
 * ```ts
 * const store = inject(KjChatStore);
 * store.sendUser('Summarise the spec');
 * store.beginAssistant();
 * for await (const token of myModelStream()) store.pushChunk(token);
 * store.endAssistant();
 * ```
 * @doc-category Core/AI
 * @doc
 * @doc-name chat-store
 * @doc-description Headless provider-agnostic streaming chat state — messages, status, and the token-append API.
 */
@Injectable()
export class KjChatStore {
  private readonly _messages = signal<readonly KjChatMessageData[]>([]);
  private readonly _status = signal<KjChatStatus>('idle');
  private readonly _streamingId = signal<string | null>(null);

  /** The full message list. */
  readonly messages = this._messages.asReadonly();
  /** Current stream status. */
  readonly status = this._status.asReadonly();
  /** Id of the in-flight assistant message, or `null`. */
  readonly streamingId = this._streamingId.asReadonly();
  /** True while an assistant message is streaming. */
  readonly isStreaming = computed(() => this._status() === 'streaming');
  /** The current thread-level error, if any. */
  readonly error = computed(
    () => this._messages().find((m) => m.id === this._streamingId())?.error ?? null,
  );

  /** Append a user message; returns its id. */
  sendUser(content: string): string {
    const id = nextChatMessageId();
    this.append({ id, role: 'user', content, createdAt: Date.now() });
    return id;
  }

  /** Append a system message; returns its id. */
  addSystem(content: string): string {
    const id = nextChatMessageId();
    this.append({ id, role: 'system', content, createdAt: Date.now() });
    return id;
  }

  /**
   * Start an in-flight assistant message. Sets `status → 'streaming'` and
   * `streamingId`. Returns the new message id.
   */
  beginAssistant(seed = ''): string {
    const id = nextChatMessageId();
    this.append({
      id,
      role: 'assistant',
      content: seed,
      streaming: true,
      createdAt: Date.now(),
    });
    this._streamingId.set(id);
    this._status.set('streaming');
    return id;
  }

  /**
   * Append a token / chunk to the in-flight assistant message. No-op (with a
   * dev warning) if there is no in-flight message.
   */
  pushChunk(text: string): void {
    const id = this._streamingId();
    if (id === null) return;
    this.patch(id, (m) => ({ ...m, content: m.content + text }));
  }

  /** Add a tool call to the in-flight assistant message. */
  addToolCall(tc: KjChatToolCall): void {
    const id = this._streamingId();
    if (id === null) return;
    this.patch(id, (m) => ({ ...m, toolCalls: [...(m.toolCalls ?? []), tc] }));
  }

  /** Patch an existing tool call by id on the in-flight message. */
  updateToolCall(toolCallId: string, patch: Partial<KjChatToolCall>): void {
    const id = this._streamingId();
    if (id === null) return;
    this.patch(id, (m) => ({
      ...m,
      toolCalls: (m.toolCalls ?? []).map((tc) => (tc.id === toolCallId ? { ...tc, ...patch } : tc)),
    }));
  }

  /** Attach citations to the in-flight assistant message. */
  addCitations(citations: readonly KjChatCitation[]): void {
    const id = this._streamingId();
    if (id === null) return;
    this.patch(id, (m) => ({
      ...m,
      citations: [...(m.citations ?? []), ...citations],
    }));
  }

  /** Complete the in-flight message; `status → 'idle'`. */
  endAssistant(): void {
    const id = this._streamingId();
    if (id !== null) this.patch(id, (m) => ({ ...m, streaming: false }));
    this._streamingId.set(null);
    this._status.set('idle');
  }

  /**
   * Fail the in-flight turn. Sets `status → 'error'` and records the error on
   * the message. The message stops streaming but keeps any partial content.
   */
  fail(message: string): void {
    const id = this._streamingId();
    if (id !== null) {
      this.patch(id, (m) => ({ ...m, streaming: false, error: message }));
    }
    this._status.set('error');
  }

  /**
   * Consumer-initiated stop (abort). Freezes whatever partial content exists
   * and returns to `idle`. The consumer is responsible for aborting their own
   * network stream.
   */
  stop(): void {
    const id = this._streamingId();
    if (id !== null) this.patch(id, (m) => ({ ...m, streaming: false }));
    this._streamingId.set(null);
    this._status.set('idle');
  }

  /** Replace the whole message list (e.g. load history). */
  setMessages(messages: readonly KjChatMessageData[]): void {
    this._messages.set([...messages]);
  }

  /** Clear the thread and return to `idle`. */
  reset(): void {
    this._messages.set([]);
    this._streamingId.set(null);
    this._status.set('idle');
  }

  private append(msg: KjChatMessageData): void {
    this._messages.update((list) => [...list, msg]);
  }

  private patch(id: string, fn: (m: KjChatMessageData) => KjChatMessageData): void {
    this._messages.update((list) => list.map((m) => (m.id === id ? fn(m) : m)));
  }
}
