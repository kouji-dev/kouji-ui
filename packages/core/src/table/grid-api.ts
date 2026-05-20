import type { Signal } from '@angular/core';
import type {
  Column,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ExpandedState,
  GroupingState,
  PaginationState,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  Table,
  VisibilityState,
} from '@tanstack/angular-table';
import type { KjFilterModel, KjGridFilterModel } from './filter-models';
import type { KjTableDensity, KjTableState } from './table.types';

/**
 * Operations grouped by aspect so callers can write code like
 * `api.pagination.next()` or `api.selection.toggle(id)` rather than a flat
 * verb soup. Inspired by AG-Grid's `GridApi`, but reorganised so each
 * concept (rows, selection, sort, filters, pagination, expansion,
 * grouping, density) gets its own namespace — methods inside drop the
 * noun suffix because the namespace already supplies it.
 */
export interface KjGridApi<TData extends RowData = unknown> {
  /** Reactive view of the full table state. Use inside `computed`/`effect`. */
  readonly state: Signal<KjTableState>;

  /** The underlying TanStack `Table<T>` instance. Escape hatch for advanced use. */
  table(): Table<TData>;

  /** Rows: source data + filtered/sorted/paginated derivatives. */
  readonly rows: KjRowsApi<TData>;

  /** Row selection — single, multi, bulk. */
  readonly selection: KjSelectionApi<TData>;

  /** Sort model + per-column toggle. */
  readonly sort: KjSortApi;

  /** Column filters + global search. */
  readonly filter: KjFilterApi;

  /** Pagination model + cursor navigation. */
  readonly pagination: KjPaginationApi;

  /** Row expansion model. */
  readonly expansion: KjExpansionApi;

  /** Grouping order. */
  readonly grouping: KjGroupingApi;

  /** Density preset. */
  readonly density: KjDensityApi;

  /** Merge a partial state. Unspecified slices are untouched. */
  setState(partial: Partial<KjTableState>): void;

  /** Reset every slice to the directive's defaults. */
  resetState(): void;
}

/** Source + derived row models. */
export interface KjRowsApi<TData> {
  /** Source data array bound to the table (pre-filter, pre-sort). */
  all(): readonly TData[];
  /** RowModel after filtering, sorting, pagination, grouping. */
  displayed(): Row<TData>[];
  /** Total source rows. */
  count(): number;
  /** Rows surviving filters (before pagination clamps). */
  filteredCount(): number;
  /** Rows visible in the current page. */
  displayedCount(): number;
  /** Look up a TanStack row by id. */
  get(id: string): Row<TData> | undefined;
}

/** Row selection ops. */
export interface KjSelectionApi<TData> {
  /** Current selection map. */
  get(): RowSelectionState;
  /** Replace the entire selection map. */
  set(model: RowSelectionState): void;
  /** Resolved row instances for the current selection (within filtered model). */
  rows(): Row<TData>[];
  /** Ids of selected rows. */
  ids(): readonly string[];
  /** True when at least one row is selected. */
  has(): boolean;
  /** Set a single row's selection. */
  select(id: string, selected?: boolean): void;
  /** Deselect a single row. */
  deselect(id: string): void;
  /** Toggle a single row's selection. */
  toggle(id: string): void;
  /** Select every row in the current filtered model. */
  all(): void;
  /** Clear all selection state. */
  clear(): void;
}

/** Sort model + per-column toggle. */
export interface KjSortApi {
  /** Current sort entries. */
  get(): SortingState;
  /** Replace the sort model. */
  set(sorting: SortingState): void;
  /** Toggle a single column's sort direction (asc → desc → none). */
  toggle(columnId: string, multi?: boolean): void;
  /** Remove every sort entry. */
  clear(): void;
}

/** Column filters + global search. */
export interface KjFilterApi {
  /** Read a single column's filter value. */
  get(columnId: string): unknown;
  /** Set or clear a column's filter (`undefined`/`null`/`''` clears). */
  set(columnId: string, value: unknown): void;
  /** Clear a single column's filter. */
  clear(columnId: string): void;
  /** All column filter entries. */
  all(): ColumnFiltersState;
  /** Replace every column filter at once. */
  setAll(filters: ColumnFiltersState): void;
  /** Global (cross-column) search string. */
  readonly global: KjGlobalFilterApi;
  /** Clear column filters AND global filter in one shot. */
  clearAll(): void;

  // ── Structured filter model (AG-Grid-compatible, for SSR) ──────────────

  /**
   * Read a single column's filter as a structured {@link KjFilterModel}.
   * Returns `undefined` when the column has no filter or its value is a
   * raw (non-model) primitive — call {@link KjFilterApi.get} for the
   * legacy raw view.
   */
  getModelFor(columnId: string): KjFilterModel | undefined;
  /** Apply a structured model to a single column. `null` clears. */
  setModelFor(columnId: string, model: KjFilterModel | null | undefined): void;
  /**
   * Snapshot every column's filter as a `KjGridFilterModel`
   * (`Record<columnId, KjFilterModel>`). Use to serialise filter state
   * for server-side queries or persistence. Columns whose value is a
   * raw primitive (no `filterType` discriminator) are omitted — pair
   * with `all()` for the legacy bulk view.
   */
  getModel(): KjGridFilterModel;
  /**
   * Replace the entire grid-level filter model. Matches AG-Grid's
   * `setFilterModel` contract: columns absent from `model` are cleared.
   */
  setModel(model: KjGridFilterModel | null): void;
}

export interface KjGlobalFilterApi {
  get(): string;
  set(value: string): void;
  clear(): void;
}

/** Pagination model + cursor navigation. */
export interface KjPaginationApi {
  /** Current `{ pageIndex, pageSize }`. */
  get(): PaginationState;
  /** Replace pagination state. */
  set(pagination: PaginationState): void;
  /** Total pages for the current filtered model. */
  pageCount(): number;
  /** Jump to a 0-indexed page. Clamped to `[0, pageCount-1]`. */
  setPageIndex(pageIndex: number): void;
  /** Change rows per page. Resets to page 0 to keep the view coherent. */
  setPageSize(pageSize: number): void;
  /** Advance one page, no-op if already on the last page. */
  next(): void;
  /** Rewind one page, no-op if already on page 0. */
  previous(): void;
  /** Jump to page 0. */
  first(): void;
  /** Jump to the last page. */
  last(): void;
}

/** Row expansion model. */
export interface KjExpansionApi<TData = unknown> {
  /** Current expansion state. `true` = every row expanded. */
  get(): ExpandedState;
  /** Replace expansion state. */
  set(expanded: ExpandedState): void;
  /** Set a single row's expanded state. */
  setRow(id: string, expanded: boolean): void;
  /** Toggle a single row's expanded state. */
  toggle(id: string): void;
  /** Expand every row in the current filtered model. */
  expandAll(): void;
  /** Collapse every row. */
  collapseAll(): void;
}

/** Grouping order. */
export interface KjGroupingApi {
  /** Current grouping (ordered column ids). */
  get(): GroupingState;
  /** Replace grouping. */
  set(grouping: GroupingState): void;
  /** Add a column to the grouping order (no-op if already grouped). */
  add(columnId: string): void;
  /** Remove a column from grouping. Omit `columnId` to clear all grouping. */
  remove(columnId?: string): void;
}

/** Density preset. */
export interface KjDensityApi {
  get(): KjTableDensity;
  set(density: KjTableDensity): void;
}

/**
 * Per-column operations + bulk column state. Mirrors `KjGridApi`'s shape
 * — each concept (visibility, sizing, pinning, order, grouping) is its
 * own namespace.
 */
export interface KjColumnApi<TData extends RowData = unknown> {
  /** Look up a column by id. */
  get(columnId: string): Column<TData, unknown> | null;
  /** Every column (leaf + group). */
  all(): Column<TData, unknown>[];
  /** Leaf columns only. */
  leaves(): Column<TData, unknown>[];
  /** Leaf columns currently visible. */
  visibleLeaves(): Column<TData, unknown>[];

  /** Column visibility ops. */
  readonly visibility: KjColumnVisibilityApi;
  /** Column width/sizing ops. */
  readonly sizing: KjColumnSizingApi;
  /** Column pinning ops. */
  readonly pinning: KjColumnPinningApi;
  /** Column order ops. */
  readonly order: KjColumnOrderApi;
  /** Per-column grouping toggle. */
  readonly grouping: KjColumnGroupingApi;

  /** Reset visibility, sizing, pinning, order, and grouping in one shot. */
  reset(): void;
}

export interface KjColumnVisibilityApi {
  get(): VisibilityState;
  set(model: VisibilityState): void;
  isVisible(columnId: string): boolean;
  setVisible(columnId: string, visible: boolean): void;
  setManyVisible(columnIds: readonly string[], visible: boolean): void;
}

export interface KjColumnSizingApi {
  get(): ColumnSizingState;
  set(model: ColumnSizingState): void;
  width(columnId: string): number;
  setWidth(columnId: string, width: number): void;
}

export interface KjColumnPinningApi {
  get(): ColumnPinningState;
  set(model: ColumnPinningState): void;
  of(columnId: string): 'left' | 'right' | null;
  pin(columnId: string, side: 'left' | 'right' | null): void;
}

export interface KjColumnOrderApi {
  get(): ColumnOrderState;
  set(order: ColumnOrderState): void;
  move(columnId: string, toIndex: number): void;
}

export interface KjColumnGroupingApi {
  is(columnId: string): boolean;
  set(columnId: string, grouped: boolean): void;
}
