import { Injectable, signal } from '@angular/core';

/** Options for {@link coalesceAnnouncement}. */
export interface KjCoalesceOptions {
  /**
   * Max characters to hold without a sentence boundary before flushing at the
   * last word boundary. Prevents a long boundary-less clause from being held
   * silent indefinitely. Default `160`.
   */
  readonly maxChars?: number;
}

/** Result of a coalescing pass. */
export interface KjCoalesceResult {
  /** Text ready to announce now (may be empty). */
  readonly toAnnounce: string;
  /** Trailing partial text to keep buffered for the next pass. */
  readonly remainder: string;
}

/** Sentence-ending punctuation we flush on. */
const SENTENCE_END = /[.!?\n]/g;

/**
 * Pure coalescing logic for the streaming live region — **the differentiator**.
 *
 * Screen readers announce every mutation of an `aria-live` region, so pushing a
 * streamed reply char-by-char produces an unusable torrent. This function holds
 * the streamed `buffer` and releases it only in **whole units**:
 *
 * 1. Flush up to and including the **last sentence boundary** (`.`, `!`, `?`,
 *    newline). The trailing partial sentence stays in `remainder`.
 * 2. If no boundary exists but the buffer exceeds `maxChars`, flush up to the
 *    last **word** boundary (space) so a long clause is not held silent.
 * 3. Otherwise announce nothing yet (`toAnnounce: ''`).
 *
 * The caller appends new chunks to `remainder` and calls this again; on stream
 * completion it flushes the final remainder unconditionally (see
 * {@link KjChatAnnouncer.flush}).
 *
 * @example
 * ```ts
 * coalesceAnnouncement('Hello there. How ar')
 * // → { toAnnounce: 'Hello there.', remainder: ' How ar' }
 * ```
 */
export function coalesceAnnouncement(
  buffer: string,
  opts: KjCoalesceOptions = {},
): KjCoalesceResult {
  const maxChars = opts.maxChars ?? 160;

  // Find the last sentence boundary.
  let lastEnd = -1;
  SENTENCE_END.lastIndex = 0;
  for (let m = SENTENCE_END.exec(buffer); m; m = SENTENCE_END.exec(buffer)) {
    lastEnd = m.index;
  }

  if (lastEnd >= 0) {
    const cut = lastEnd + 1;
    return {
      toAnnounce: buffer.slice(0, cut).trim(),
      remainder: buffer.slice(cut),
    };
  }

  // No sentence boundary — flush at a word boundary only if over budget.
  if (buffer.length > maxChars) {
    const lastSpace = buffer.lastIndexOf(' ');
    if (lastSpace > 0) {
      return {
        toAnnounce: buffer.slice(0, lastSpace).trim(),
        remainder: buffer.slice(lastSpace + 1),
      };
    }
    // A single very long token — flush it whole rather than hold forever.
    return { toAnnounce: buffer.trim(), remainder: '' };
  }

  return { toAnnounce: '', remainder: buffer };
}

/**
 * Stateful wrapper around {@link coalesceAnnouncement} that exposes the current
 * announcement as a signal for a visually-hidden `aria-live="polite"` region.
 *
 * `push()` accumulates streamed text and emits coalesced sentences; `flush()`
 * (called on stream completion) releases the final remainder; `announce()`
 * pushes a discrete status line (e.g. an error) immediately.
 *
 * The emitted string toggles through empty between announcements so repeated
 * identical sentences are still re-announced by AT.
 *
 * @doc-category Core/AI
 * @doc
 * @doc-name chat-announcer
 * @doc-description Coalesces streamed tokens into whole-sentence polite live-region announcements.
 */
@Injectable()
export class KjChatAnnouncer {
  private buffer = '';
  private readonly _message = signal('');
  private toggle = false;

  /** The current announcement text for the polite live region. */
  readonly message = this._message.asReadonly();

  /** Max chars held without a boundary before a word-boundary flush. */
  maxChars = 160;

  /** Append streamed text; emits any newly-completed sentence(s). */
  push(chunk: string): void {
    this.buffer += chunk;
    const { toAnnounce, remainder } = coalesceAnnouncement(this.buffer, {
      maxChars: this.maxChars,
    });
    this.buffer = remainder;
    if (toAnnounce) this.emit(toAnnounce);
  }

  /** Force-release the buffered remainder (call on stream completion). */
  flush(): void {
    const text = this.buffer.trim();
    this.buffer = '';
    if (text) this.emit(text);
  }

  /** Announce a discrete status line immediately (bypasses coalescing). */
  announce(text: string): void {
    if (text.trim()) this.emit(text.trim());
  }

  /** Clear buffered text and the current announcement. */
  clear(): void {
    this.buffer = '';
    this._message.set('');
  }

  private emit(text: string): void {
    // Alternate a trailing zero-width space so identical consecutive
    // sentences still register as a live-region change for AT.
    this.toggle = !this.toggle;
    this._message.set(this.toggle ? text : text + '​');
  }
}
