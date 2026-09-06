import { InjectionToken, type Provider, type Type } from '@angular/core';

/**
 * What every thread-item renderer receives. A renderer is an ordinary
 * standalone component with an `item` input of this shape — nothing in the
 * kit is special-cased, so a consumer's component and a built-in one are
 * interchangeable.
 */
export interface KjChatItemInput<TData = unknown> {
  /** Stable id, used as the list key. */
  readonly id: string;
  /**
   * Which renderer draws this item. Absent means "the default for this
   * role" — a plain message.
   */
  readonly type?: string;
  /** Conversation role, for side/label semantics. */
  readonly role: string;
  /** Whatever the renderer needs. Opaque to the kit. */
  readonly data: TData;
}

/** A component that can draw a thread item. */
export type KjChatRenderer = Type<unknown>;

/** Registry of `type` → component, plus what to draw for an unknown type. */
export interface KjChatConfig {
  /**
   * Renderers by item `type`. Merged OVER the built-in defaults, so naming a
   * built-in type replaces it and any other name adds one.
   */
  readonly renderers: Readonly<Record<string, KjChatRenderer>>;
  /**
   * Drawn when no renderer matches an item's `type`. Omitted, the thread
   * falls back to its plain message renderer, so an unknown type degrades to
   * readable text rather than a hole in the transcript.
   */
  readonly fallback?: KjChatRenderer;
}

/**
 * The resolved chat configuration. Read by the thread; written by
 * {@link provideKjChat}. Defaults to an empty registry so the thread works
 * with no provider at all.
 */
export const KJ_CHAT_CONFIG = new InjectionToken<KjChatConfig>('KJ_CHAT_CONFIG', {
  providedIn: 'root',
  factory: () => ({ renderers: {} }),
});

/**
 * Register thread-item renderers.
 *
 * ```ts
 * provideKjChat({
 *   renderers: { chart: ChartBubble, markdown: MyMarkdown },
 *   fallback: UnknownItem,
 * })
 * ```
 *
 * Provide it at the application root for app-wide renderers, or on a route /
 * component for a chat that draws its own item kinds — the nearest injector
 * wins, exactly like any other Angular provider.
 */
export function provideKjChat(config: KjChatConfig): Provider {
  return { provide: KJ_CHAT_CONFIG, useValue: config };
}
