// packages/core/src/primitives/list/filterable-list.ts
import { Injectable, type Signal, computed, effect, signal } from '@angular/core';
import type { KjFilterFn } from './tokens';
import type { KjListItem } from './item';

const defaultSubstring: KjFilterFn = (q, hs) => {
  if (!q) return 1;
  const needle = q.toLowerCase();
  return hs.some(h => h.toLowerCase().includes(needle)) ? 1 : 0;
};

const EMPTY_ITEMS = signal<readonly KjListItem<unknown>[]>([]);

/**
 * Filter / search state for a list-style consumer (KjCombobox,
 * KjCommandPalette). Reads its items source + filter inputs through
 * {@link bind}, so no DI lookup is needed at construction (which sidesteps
 * the cyclic dep that arises when the root provides itself under
 * `KJ_LIST_NAVIGATOR_CONFIG` and `KjFilterableList` together).
 *
 * Side effects (via `effect`):
 * - Calls `item.setVisible(bool)` on every item to reflect filter state.
 * - Stamps `item.posInSet` / `item.setSize` for visible items; clears
 *   them to `null` for hidden items.
 *
 * Exposes `visibleItems`, `visibleCount`, `resultCount`, `isEmpty`, plus a human
 * `announcement()` signal consumers wire into a `kjLiveRegion` so
 * WCAG 4.1.3 (Status Messages) is honored.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjFilterableList<T = unknown> {
  /**
   * Source signals. Replaced wholesale by {@link bind} so the consumer's
   * reactive inputs become the canonical state. `bind` MUST be called
   * from the consumer's constructor, before any downstream consumer
   * (e.g. KjListNavigator) subscribes to `visibleItems`.
   */
  private _items: Signal<readonly KjListItem<T>[]> = EMPTY_ITEMS as Signal<readonly KjListItem<T>[]>;
  private _query: Signal<string>              = signal('');
  private _filterFn: Signal<KjFilterFn>       = signal(defaultSubstring);
  private _shouldFilter: Signal<boolean>      = signal(true);
  private _autoActivateFirst: Signal<boolean> = signal(true);

  /** Current query string. */
  readonly query = () => this._query();

  /** Items passing the current filter. */
  readonly visibleItems = computed<readonly KjListItem<T>[]>(() => {
    const all = this._items();
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
   * Number of results the user can reach — the dataset size when a window is
   * declared ({@link setWindow}), otherwise the rendered visible count. A
   * windowed list has twenty rows in the DOM and five thousand results, and
   * it is the five thousand a status message has to report.
   */
  readonly resultCount = computed(() => this._datasetSize() ?? this.visibleCount());

  /**
   * Human-readable status string for `aria-live` regions.
   * Returns `'N results'` or `'No results'`. Wire to `kjLiveRegion`
   * to satisfy WCAG 4.1.3 Status Messages.
   */
  readonly announcement = computed(() =>
    this.resultCount() === 0 ? 'No results' : `${this.resultCount()} results`,
  );

  /**
   * Read-only view of the auto-activate-first toggle. When `true`,
   * consumers should activate the first visible item on each query change.
   * This service does NOT activate items itself; the consumer reads it.
   */
  readonly autoActivateFirst = () => this._autoActivateFirst();

  private readonly _windowOffset = signal(0);
  private readonly _datasetSize = signal<number | null>(null);

  /**
   * Declare that the registered items are a WINDOW of a larger dataset:
   * `offset` is the dataset index of the first registered item and `total`
   * the dataset size (`null` clears the window).
   *
   * Without this, a windowed list would stamp `aria-posinset="1"` /
   * `aria-setsize="20"` on row 3 000, and a screen reader would announce a
   * 5 000-option listbox as twenty options. Called by the wrapper that owns
   * the window; every non-windowed consumer leaves it alone.
   */
  setWindow(offset: number, total: number | null): void {
    this._windowOffset.set(Math.max(0, Math.floor(offset)));
    this._datasetSize.set(total === null ? null : Math.max(0, Math.floor(total)));
  }

  /**
   * Bind consumer-owned source signals. Each is optional; unbound keys
   * keep their previous source (defaulting to constants on first construct).
   *
   * Replaces the imperative setter-in-effect pattern when the consumer
   * holds the canonical reactive state (typically a `model()` /
   * `input()` / `contentChildren()`). Call once in the consumer's
   * constructor before any downstream `computed` / `effect` subscribes
   * to `visibleItems`.
   */
  bind(sources: {
    readonly items?:             Signal<readonly KjListItem<T>[]>;
    readonly query?:             Signal<string>;
    readonly filterFn?:          Signal<KjFilterFn>;
    readonly shouldFilter?:      Signal<boolean>;
    readonly autoActivateFirst?: Signal<boolean>;
  }): void {
    if (sources.items)             this._items = sources.items;
    if (sources.query)             this._query = sources.query;
    if (sources.filterFn)          this._filterFn = sources.filterFn;
    if (sources.shouldFilter)      this._shouldFilter = sources.shouldFilter;
    if (sources.autoActivateFirst) this._autoActivateFirst = sources.autoActivateFirst;
  }

  constructor() {
    // Toggle visibility + stamp posInSet/setSize on each item whenever
    // the filtered visible set changes.
    effect(() => {
      const all = this._items();
      const visible = this.visibleItems() as readonly KjListItem<unknown>[];
      const visibleSet = new Set(visible.map(v => v.id));
      const offset = this._windowOffset();
      const total = this._datasetSize() ?? visible.length;
      let i = 0;
      for (const item of all) {
        const isVisible = visibleSet.has(item.id);
        item.setVisible(isVisible);
        if (isVisible) {
          item.posInSet.set(offset + ++i);
          item.setSize.set(total);
        } else {
          item.posInSet.set(null);
          item.setSize.set(null);
        }
      }
    });
  }
}
