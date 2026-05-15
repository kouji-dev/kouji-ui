// packages/core/src/primitives/list/filterable-list.ts
import { Injectable, Injector, type Signal, computed, effect, inject, signal } from '@angular/core';
import { KJ_LIST_NAVIGATOR_CONFIG, type KjFilterFn, type KjListNavigatorConfig } from './tokens';
import type { KjListItem } from './item';

// Field defaults so the service is usable without bind() in tests.
const defaultQuery: Signal<string> = signal('');

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
 * **Binding sources** — consumers wire their reactive inputs (typically
 * `model()` / `input()` signals) via {@link bind}. Replaces the
 * imperative setter-in-effect pattern with a single signal handoff.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjFilterableList<T = unknown> {
  private readonly injector = inject(Injector);
  /**
   * Resolved once on first access then cached. Direct `inject` at
   * construction would deadlock when both `KjFilterableList` and
   * `KJ_LIST_NAVIGATOR_CONFIG` (`useExisting` the root directive) are
   * provided on the same element — at that point the root is still
   * mid-construction. First access happens inside an effect that fires
   * AFTER construction, when the root is fully resolved.
   */
  private _cfg?: KjListNavigatorConfig;
  private get cfg(): KjListNavigatorConfig {
    return (this._cfg ??= this.injector.get(KJ_LIST_NAVIGATOR_CONFIG));
  }

  /**
   * Source signals. Replaced wholesale by {@link bind} so the consumer's
   * reactive inputs become the canonical state. `bind` MUST be called
   * from the consumer's constructor, before any downstream consumer
   * (e.g. KjListNavigator) subscribes to `visibleItems`.
   */
  private _query: Signal<string>             = defaultQuery;
  private _filterFn: Signal<KjFilterFn>       = signal(defaultSubstring);
  private _shouldFilter: Signal<boolean>      = signal(true);
  private _autoActivateFirst: Signal<boolean> = signal(true);

  /** Current query string. */
  readonly query = () => this._query();

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
   * This service does NOT activate items itself; the consumer reads it.
   */
  readonly autoActivateFirst = () => this._autoActivateFirst();

  /**
   * Bind consumer-owned source signals. Each is optional; unbound keys
   * keep their previous source (defaulting to a constant on first construct).
   *
   * Replaces the imperative setQuery/setFilterFn/etc. setters when the
   * consumer holds the canonical reactive state (typically a `model()`
   * or `input()`). Call once in the consumer's constructor before any
   * downstream `computed` / `effect` subscribes to `visibleItems`.
   */
  bind(sources: {
    readonly query?:             Signal<string>;
    readonly filterFn?:          Signal<KjFilterFn>;
    readonly shouldFilter?:      Signal<boolean>;
    readonly autoActivateFirst?: Signal<boolean>;
  }): void {
    if (sources.query)             this._query = sources.query;
    if (sources.filterFn)          this._filterFn = sources.filterFn;
    if (sources.shouldFilter)      this._shouldFilter = sources.shouldFilter;
    if (sources.autoActivateFirst) this._autoActivateFirst = sources.autoActivateFirst;
  }

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
