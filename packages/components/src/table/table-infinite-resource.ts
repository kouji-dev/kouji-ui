import {
  DestroyRef,
  Injector,
  assertInInjectionContext,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import type { KjTableRange } from './table-virtual';

/** What {@link kjTableInfiniteResource}'s loader receives for one page. */
export interface KjTableInfiniteLoadParams<TRequest> {
  /** The current `request()` value — filters, sort, search. */
  readonly request: TRequest;
  /** Index of the first row to return. */
  readonly offset: number;
  /** Number of rows to return (the page size). */
  readonly limit: number;
  /** Aborted when the page is no longer needed (request change, scrolled away, destroy). */
  readonly abortSignal: AbortSignal;
}

/** One page of a server result set. */
export interface KjTableInfinitePage<TData> {
  /** The rows from `offset`, at most `limit` of them. */
  readonly rows: readonly TData[];
  /** Size of the whole result set for this request. */
  readonly total: number;
}

/** Options for {@link kjTableInfiniteResource}. */
export interface KjTableInfiniteResourceOptions<TData, TRequest> {
  /**
   * The query (filters, sort, search). Read reactively: a new value aborts
   * every in-flight page, refetches from the top and, once the first page
   * lands, replaces the cached rows (the table scrolls back to the top).
   */
  readonly request: () => TRequest;
  /** Rows per fetched page. */
  readonly pageSize: number;
  /** Loads one page. Reject (or throw) to surface `error()`; aborted loads are ignored. */
  readonly loader: (
    params: KjTableInfiniteLoadParams<TRequest>,
  ) => Promise<KjTableInfinitePage<TData>>;
  /** Extra pages fetched beyond each edge of the visible range. Default 1. */
  readonly overscanPages?: number;
  /** Injector when called outside an injection context. */
  readonly injector?: Injector;
}

/** Options for {@link KjTableInfiniteResource.reload}. */
export interface KjTableInfiniteReloadOptions {
  /**
   * `true` refreshes the pages in view in the background, keeping the loaded
   * rows and the scroll position (other cached pages refetch when scrolled
   * back into view). `false` (default) resets like a request change.
   */
  readonly silent?: boolean;
}

/**
 * Page cache behind a server-side infinite `<kj-table>` — see
 * {@link kjTableInfiniteResource}.
 */
export interface KjTableInfiniteResource<TData> {
  /**
   * Index-aligned rows of the whole result set: `rows()[i]` is row `i`, or a
   * hole while its page is not loaded. Its length is `total()`.
   */
  readonly rows: Signal<readonly (TData | undefined)[]>;
  /** Size of the result set, `0` until the first page lands. */
  readonly total: Signal<number>;
  /** `true` while the first page of a new request (or a non-silent reload) is loading. */
  readonly isResetting: Signal<boolean>;
  /** `true` while pages beyond the first are loading for the visible range. */
  readonly isFetchingMore: Signal<boolean>;
  /** `true` while a silent reload is refreshing the pages in view. */
  readonly isRefreshing: Signal<boolean>;
  /** The last load failure, cleared by the next successful page. */
  readonly error: Signal<unknown>;
  /** Bumped every time a reset completes — the table scrolls back to the top on it. */
  readonly resets: Signal<number>;
  /** Report the rows in view (wire it to `(rangeChange)`); missing pages are fetched. */
  setRange(range: KjTableRange | null): void;
  /** Refetch — see {@link KjTableInfiniteReloadOptions}. */
  reload(options?: KjTableInfiniteReloadOptions): void;
}

/**
 * Server-side infinite scrolling for `<kj-table>`. Caches pages of a server
 * result set, fetches the pages the visible range (plus `overscanPages`)
 * needs, aborts loads that fall out of view, and resets to the top when
 * `request()` changes. Bind it with `[kjInfinite]` — or wire the parts by
 * hand: `[kjData]="r.rows()"`, `[kjRowCount]="r.total()"`,
 * `(rangeChange)="r.setRange($event)"`.
 *
 * Rows need a stable id (`[kjGetRowId]`, or the default result-set index) so
 * selection and expansion survive pages loading around them.
 *
 * @example
 * ```ts
 * readonly people = kjTableInfiniteResource({
 *   request: () => ({ search: this.search() }),
 *   pageSize: 50,
 *   loader: ({ request, offset, limit, abortSignal }) =>
 *     fetch(`/api/people?q=${request.search}&offset=${offset}&limit=${limit}`, { signal: abortSignal })
 *       .then((r) => r.json()),
 * });
 * ```
 * ```html
 * <kj-table [kjColumns]="cols" [kjGetRowId]="byId" [kjInfinite]="people" kjLoadingMode="overlay" />
 * ```
 */
export function kjTableInfiniteResource<TData, TRequest = unknown>(
  options: KjTableInfiniteResourceOptions<TData, TRequest>,
): KjTableInfiniteResource<TData> {
  if (!options.injector) assertInInjectionContext(kjTableInfiniteResource);
  const injector = options.injector ?? inject(Injector);
  const pageSize = Math.max(1, Math.floor(options.pageSize));
  const overscanPages = Math.max(0, Math.floor(options.overscanPages ?? 1));

  /** Loaded pages of the active request, by page number. */
  let pages = new Map<number, readonly TData[]>();
  /** Pages kept on screen after a silent reload but refetched once back in view. */
  const stale = new Set<number>();
  /** In-flight loads by page number. */
  const inflight = new Map<number, { controller: AbortController; kind: 'more' | 'refresh' }>();
  /** The pending reset's controller (first page of a new request). */
  let resetLoad: AbortController | null = null;
  /** Request of the rows on screen; `undefined` before the first reset. */
  let active: { request: TRequest } | null = null;
  let lastRange: KjTableRange | null = null;
  let destroyed = false;

  const version = signal(0);
  const total = signal(0);
  const isResetting = signal(false);
  const inflightMore = signal(0);
  const inflightRefresh = signal(0);
  const error = signal<unknown>(null);
  const resets = signal(0);

  const rows = computed<readonly (TData | undefined)[]>(() => {
    version();
    const count = total();
    const out = new Array<TData | undefined>(count);
    for (const [page, pageRows] of pages) {
      const offset = page * pageSize;
      const n = Math.min(pageRows.length, count - offset);
      for (let i = 0; i < n; i++) out[offset + i] = pageRows[i];
    }
    return out;
  });

  const touch = (): void => version.update((v) => v + 1);

  const abortInflight = (): void => {
    for (const { controller } of inflight.values()) controller.abort();
    inflight.clear();
    inflightMore.set(0);
    inflightRefresh.set(0);
  };

  /** Page numbers the given range needs, clamped to the known total. */
  const neededPages = (range: KjTableRange | null): number[] => {
    const first = Math.max(0, Math.floor((range?.startIndex ?? 0) / pageSize) - overscanPages);
    let last = Math.floor((range?.endIndex ?? 0) / pageSize) + overscanPages;
    const lastPage = Math.ceil(total() / pageSize) - 1;
    last = Math.min(last, lastPage);
    const out: number[] = [];
    for (let p = first; p <= last; p++) out.push(p);
    return out;
  };

  const loadPage = (page: number, kind: 'more' | 'refresh'): void => {
    if (!active || inflight.has(page)) return;
    const request = active.request;
    const controller = new AbortController();
    inflight.set(page, { controller, kind });
    const counter = kind === 'more' ? inflightMore : inflightRefresh;
    counter.update((n) => n + 1);
    const settle = (): void => {
      if (inflight.get(page)?.controller !== controller) return;
      inflight.delete(page);
      counter.update((n) => Math.max(0, n - 1));
    };
    void Promise.resolve()
      .then(() =>
        options.loader({
          request,
          offset: page * pageSize,
          limit: pageSize,
          abortSignal: controller.signal,
        }),
      )
      .then(
        (result) => {
          if (controller.signal.aborted || destroyed) return;
          settle();
          pages.set(page, result.rows);
          stale.delete(page);
          if (result.total !== total()) {
            total.set(Math.max(0, result.total));
            // A shrunk result set drops the pages past its end.
            for (const p of pages.keys()) if (p * pageSize >= result.total) pages.delete(p);
          }
          error.set(null);
          touch();
          // A grown total may expose pages the range already wanted.
          ensure();
        },
        (cause: unknown) => {
          if (controller.signal.aborted || destroyed) return;
          settle();
          error.set(cause);
        },
      );
  };

  /** Fetch the missing (or stale) pages around the last reported range. */
  const ensure = (): void => {
    if (!active || resetLoad) return;
    const needed = neededPages(lastRange);
    const wanted = new Set(needed);
    // Scrolled past: a load for a page that is no longer near the viewport is stale.
    for (const [page, load] of inflight) {
      if (!wanted.has(page) && load.kind === 'more') {
        load.controller.abort();
        inflight.delete(page);
        inflightMore.update((n) => Math.max(0, n - 1));
      }
    }
    for (const page of needed) {
      if (!pages.has(page)) loadPage(page, 'more');
      else if (stale.has(page)) loadPage(page, 'refresh');
    }
  };

  /** Load the first page of `request`; the cache is swapped only when it lands. */
  const reset = (request: TRequest): void => {
    resetLoad?.abort();
    abortInflight();
    const controller = new AbortController();
    resetLoad = controller;
    isResetting.set(true);
    void Promise.resolve()
      .then(() =>
        options.loader({ request, offset: 0, limit: pageSize, abortSignal: controller.signal }),
      )
      .then(
        (result) => {
          if (controller.signal.aborted || destroyed) return;
          resetLoad = null;
          active = { request };
          pages = new Map([[0, result.rows]]);
          stale.clear();
          total.set(Math.max(0, result.total));
          error.set(null);
          isResetting.set(false);
          // The table scrolls back to the top: the next range starts at row 0.
          const span = lastRange ? lastRange.endIndex - lastRange.startIndex : 0;
          lastRange = { startIndex: 0, endIndex: span };
          touch();
          resets.update((n) => n + 1);
          ensure();
        },
        (cause: unknown) => {
          if (controller.signal.aborted || destroyed) return;
          resetLoad = null;
          // Keep whatever was on screen; the error pane explains the failure.
          active ??= { request };
          isResetting.set(false);
          error.set(cause);
        },
      );
  };

  effect(
    () => {
      const request = options.request();
      untracked(() => reset(request));
    },
    { injector },
  );

  injector.get(DestroyRef).onDestroy(() => {
    destroyed = true;
    resetLoad?.abort();
    abortInflight();
  });

  return {
    rows,
    total: total.asReadonly(),
    isResetting: isResetting.asReadonly(),
    isFetchingMore: computed(() => inflightMore() > 0),
    isRefreshing: computed(() => inflightRefresh() > 0),
    error: error.asReadonly(),
    resets: resets.asReadonly(),
    setRange(range: KjTableRange | null): void {
      lastRange = range;
      ensure();
    },
    reload(reloadOptions?: KjTableInfiniteReloadOptions): void {
      if (!reloadOptions?.silent || !active) {
        reset(untracked(options.request));
        return;
      }
      // Silent: every cached page goes stale; the ones in view refetch now.
      for (const page of pages.keys()) stale.add(page);
      for (const [page, load] of inflight) {
        load.controller.abort();
        inflight.delete(page);
      }
      inflightMore.set(0);
      inflightRefresh.set(0);
      ensure();
    },
  };
}
