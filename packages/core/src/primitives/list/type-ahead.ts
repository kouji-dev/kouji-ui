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
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjTypeAhead {
  /** Debounce window (ms) that resets the buffer between key presses. */
  readonly debounceMs = signal(500);

  private _buffer = '';
  private _lastKeyAt = 0;

  /**
   * Append `key` to the buffer (reset if outside debounce window), then
   * return the id of the first non-disabled item whose label starts with
   * the buffered prefix. Returns `null` if no item matches.
   */
  match(key: string, items: readonly KjListItem<unknown>[]): string | null {
    if (key.length !== 1) return null;
    const now = performance.now();
    if (now - this._lastKeyAt > this.debounceMs()) this._buffer = '';
    this._buffer += key.toLowerCase();
    this._lastKeyAt = now;

    const needle = this._buffer;
    const hit = items.find(
      i => !i.disabled() && i.label().toLowerCase().startsWith(needle),
    );
    return hit?.id ?? null;
  }

  /** Clear the buffer and last-key timestamp. */
  reset(): void {
    this._buffer = '';
    this._lastKeyAt = 0;
  }
}
