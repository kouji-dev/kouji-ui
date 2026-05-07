import { InjectionToken, type Signal } from '@angular/core';

/** Logical side of a chat row. CSS handles the physical RTL flip via cascade. */
export type KjChatSide = 'start' | 'end';

/**
 * Per-row role override. Default `'article'` gives screen readers a per-message
 * landmark; `'listitem'` opts in to list semantics (parent log must then carry
 * `role="list"`); `null` drops the role attribute entirely.
 */
export type KjChatRole = 'article' | 'listitem' | null;

/** Read / delivery state machine for the footer. */
export type KjChatState =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'error';

/** Context shape exposed by `KjChatLog` to descendant chat directives. */
export interface KjChatLogContext {
  /** Reflected to `aria-live`. `'polite'` (default) or `'off'`. */
  readonly kjChatLogLive: Signal<'polite' | 'off'>;
  /** Optional landmark label for the log. */
  readonly kjChatLogLabel: Signal<string | undefined>;
}

/**
 * Context shape exposed by `KjChat` to its child directives. Children read this
 * to register their minted ids (header / footer) for `aria-labelledby` /
 * `aria-describedby` wiring, and to ask whether the row is part of a grouped
 * run for tail / avatar suppression.
 */
export interface KjChatContext {
  readonly kjSide: Signal<KjChatSide>;
  readonly kjChatAuthor: Signal<string | undefined>;
  /** True when this row is grouped with the previous row (same author). */
  readonly grouped: Signal<boolean>;
  /** Register a header id; the row reflects it as `aria-labelledby`. */
  registerHeaderId(id: string): void;
  unregisterHeaderId(id: string): void;
  /** Register a footer id; the row reflects it as `aria-describedby`. */
  registerFooterId(id: string): void;
  unregisterFooterId(id: string): void;
}

/** Injection token for the `KjChatLog` container. */
export const KJ_CHAT_LOG = new InjectionToken<KjChatLogContext>('KjChatLog');

/** Injection token for the `KjChat` row. */
export const KJ_CHAT = new InjectionToken<KjChatContext>('KjChat');

let _chatHeaderIdCounter = 0;
/** Allocate a stable id used for `aria-labelledby` wiring. */
export function nextChatHeaderId(): string {
  return `kj-chat-header-${++_chatHeaderIdCounter}`;
}

let _chatFooterIdCounter = 0;
/** Allocate a stable id used for `aria-describedby` wiring. */
export function nextChatFooterId(): string {
  return `kj-chat-footer-${++_chatFooterIdCounter}`;
}
