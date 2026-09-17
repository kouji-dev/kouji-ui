// packages/core/src/primitives/list/type-ahead.ts
import { Injectable, signal } from '@angular/core';
import type { KjListItem } from './item';

/**
 * Char-buffered type-ahead matcher used by `KjListNavigator` on
 * single-character key presses. Buffers characters within a debounce
 * window so users can type "ap" to jump to "Apricot" instead of just
 * "Apple". Matches case-insensitive prefix against `KjListItem.label()`.
 * Skips disabled items.
 *
 * Repeating one character cycles instead of buffering, per WAI-ARIA APG:
 * pressing `a` `a` `a` visits each item starting with "a" in turn rather than
 * searching for the string "aaa" and matching nothing.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjTypeAhead {
  /** Debounce window (ms) that resets the buffer between key presses. */
  readonly debounceMs = signal(500);

  private _buffer = '';
  private _lastKeyAt = 0;

  /**
   * Append `key` to the buffer (reset if outside the debounce window), then
   * return the id of the first non-disabled item whose label starts with the
   * buffered prefix. Returns `null` if no item matches.
   *
   * @param key - the printable character just typed.
   * @param items - the navigable set, in DOM order.
   * @param fromId - the currently active item's id, if any. Only used by the
   *   same-letter cycle, where the search starts at the item *after* it and
   *   wraps; without it a repeated letter always lands on the first match.
   */
  match(
    key: string,
    items: readonly KjListItem<unknown>[],
    fromId?: string | null,
  ): string | null {
    if (key.length !== 1) return null;
    const now = performance.now();
    const expired = now - this._lastKeyAt > this.debounceMs();
    if (expired) this._buffer = '';
    this._lastKeyAt = now;

    const char = key.toLowerCase();
    // APG: "If the same character is typed in succession, focus moves to the
    // next item starting with that character." The buffer stays one character
    // long so the cycle survives any number of presses.
    const cycling = this._buffer.length > 0 && [...this._buffer].every((c) => c === char);
    this._buffer = cycling ? char : this._buffer + char;

    const needle = this._buffer;
    const matches = (i: KjListItem<unknown>): boolean =>
      !i.disabled() && i.label().toLowerCase().startsWith(needle);

    if (!cycling) return items.find(matches)?.id ?? null;

    const from = fromId ? items.findIndex((i) => i.id === fromId) : -1;
    for (let step = 1; step <= items.length; step++) {
      const item = items[(from + step + items.length) % items.length];
      if (matches(item)) return item.id;
    }
    return null;
  }

  /** Clear the buffer and last-key timestamp. */
  reset(): void {
    this._buffer = '';
    this._lastKeyAt = 0;
  }
}
