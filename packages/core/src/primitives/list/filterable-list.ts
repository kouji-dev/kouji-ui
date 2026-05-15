// packages/core/src/primitives/list/filterable-list.ts
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { KJ_LIST_NAVIGATOR_CONFIG, type KjFilterFn } from './tokens';
import type { KjListItem } from './item';

const defaultSubstring: KjFilterFn = (q, hs) => {
  if (!q) return 1;
  const needle = q.toLowerCase();
  return hs.some(h => h.toLowerCase().includes(needle)) ? 1 : 0;
};

/**
 * Filter / search state for a list-style consumer (KjCombobox,
 * KjCommandPalette). Reads items from `KJ_LIST_NAVIGATOR_CONFIG` and
 * exposes `visibleItems`, `visibleCount`, `isEmpty`, plus a human
 * `announcement()` signal consumers wire into a `kjLiveRegion` so
 * WCAG 4.1.3 (Status Messages) is honored.
 *
 * Side effects (via `effect`):
 * - Calls `item.setVisible(bool)` on every item to reflect filter state.
 * - Stamps `item.posInSet` / `item.setSize` for visible items; clears
 *   them to `null` for hidden items.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjFilterableList<T = unknown> {
  private readonly cfg = inject(KJ_LIST_NAVIGATOR_CONFIG);

  private readonly _query = signal<string>('');
  private readonly _filterFn = signal<KjFilterFn>(defaultSubstring);
  private readonly _shouldFilter = signal<boolean>(true);
  private readonly _autoActivateFirst = signal<boolean>(true);

  /** Current query string. */
  readonly query = this._query.asReadonly();

  /** Items passing the current filter. */
  readonly visibleItems = computed<readonly KjListItem<T>[]>(() => {
    const all = this.cfg.items() as readonly KjListItem<T>[];
    if (!this._shouldFilter()) return all;
    const q = this._query();
    const fn = this._filterFn();
    return all.filter(i => fn(q, i.haystacks()) > 0);
  });

  /** Count of visible items. */
  readonly visibleCount = computed(() => this.visibleItems().length);

  /** True when no items match the current filter. */
  readonly isEmpty = computed(() => this.visibleCount() === 0);

  /**
   * Human-readable status string for `aria-live` regions.
   * Returns `'N results'` or `'No results'`. Wire to `kjLiveRegion`
   * to satisfy WCAG 4.1.3 Status Messages.
   */
  readonly announcement = computed(() =>
    this.isEmpty() ? 'No results' : `${this.visibleCount()} results`,
  );

  /**
   * Read-only view of the auto-activate-first toggle. When `true`,
   * consumers should activate the first visible item on each query change.
   * This service does NOT activate items itself; the navigator reads this.
   */
  readonly autoActivateFirst = this._autoActivateFirst.asReadonly();

  /** Replace the current query string. */
  setQuery(q: string): void { this._query.set(q); }

  /** Replace the pluggable filter function. */
  setFilterFn(fn: KjFilterFn): void { this._filterFn.set(fn); }

  /**
   * When `false`, bypass filtering and show all items regardless of
   * the current query. Restoring to `true` re-applies the filter.
   */
  setShouldFilter(b: boolean): void { this._shouldFilter.set(b); }

  /**
   * When `true`, consumers should auto-select the first visible item
   * on each query change. Defaults to `true`.
   */
  setAutoActivateFirst(b: boolean): void { this._autoActivateFirst.set(b); }

  constructor() {
    // Toggle visibility + stamp posInSet/setSize on each item whenever
    // the filtered visible set changes.
    effect(() => {
      const all = this.cfg.items();
      const visible = this.visibleItems() as readonly KjListItem<unknown>[];
      const visibleSet = new Set(visible.map(v => v.id));
      const total = visible.length;
      let i = 0;
      for (const item of all) {
        const isVisible = visibleSet.has(item.id);
        item.setVisible(isVisible);
        if (isVisible) {
          item.posInSet.set(++i);
          item.setSize.set(total);
        } else {
          item.posInSet.set(null);
          item.setSize.set(null);
        }
      }
    });
  }
}
