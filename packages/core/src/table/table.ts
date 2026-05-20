import {
  ColumnDef, RowData,
  createAngularTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, getExpandedRowModel, getGroupedRowModel,
  type ColumnSizingInfoState,
  type Table,
} from '@tanstack/angular-table';
import { Directive, InjectionToken, computed, input, model, signal } from '@angular/core';
import { toDeepSignal, type DeepSignal } from '../primitives/signals/deep-signal';
import { createGridApi } from './grid-api-impl';
import type { KjColumnApi, KjGridApi } from './grid-api';
import type { KjTableState } from './table.types';

/** Injection token providing the TanStack table instance to child directives. */
export const KJ_TABLE = new InjectionToken<KjTable<unknown>>('KjTable');

const DEFAULT_STATE: KjTableState = {
  sorting: [],
  columnFilters: [],
  globalFilter: '',
  pagination: { pageIndex: 0, pageSize: 25 },
  rowSelection: {},
  columnSizing: {},
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  expanded: {},
  grouping: [],
  density: 'standard',
};

const DEFAULT_RESIZE_INFO: ColumnSizingInfoState = {
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: [],
};

/**
 * Wraps TanStack Angular Table. Accepts `kjTable` (columns) and `kjTableData` signal inputs and
 * exposes the table instance (rows, headers, sorting) via the `KJ_TABLE` context token.
 *
 * Use `table` to access the full TanStack `Table<T>` instance in templates via `exportAs: 'kjTable'`.
 *
 * State is exposed as a single `DeepSignal<KjTableState>`:
 *
 * - `state()` — full snapshot (also used by `kjTableResource`).
 * - `state.sorting()`, `state.pagination()`, … — per-slice readonly signals,
 *   lazily memoised by the deep-signal proxy. Reading one only re-runs your
 *   consumer when that specific slice changes.
 *
 * @example
 * ```html
 * <table [kjTable]="columns" [kjTableData]="rows" #tbl="kjTable">
 *   <thead>
 *     @for (headerGroup of tbl.table().getHeaderGroups(); track headerGroup.id) {
 *       <tr>
 *         @for (header of headerGroup.headers; track header.id) {
 *           <th kjTableHeader [kjHeader]="header">
 *             {{ header.column.columnDef.header }}
 *           </th>
 *         }
 *       </tr>
 *     }
 *   </thead>
 * </table>
 * ```
 */
@Directive({
  selector: '[kjTable]',
  standalone: true,
  exportAs: 'kjTable',
  providers: [{ provide: KJ_TABLE, useExisting: KjTable }],
})
export class KjTable<TData extends RowData = unknown> {
  /** Column definitions for the table. */
  kjTable = input.required<ColumnDef<TData>[]>();

  /**
   * Data rows for the table. A `model()` so the styled wrapper can write
   * resource-resolved rows back into the directive when the user uses
   * `[kjResource]` instead of `[kjData]`. The model defaults to `[]`, and
   * a one-way external binding (`[kjTableData]="rows"`) keeps working.
   */
  kjTableData = model<TData[]>([]);

  /**
   * Optional accessor that returns a stable id for each row. When set, TanStack
   * keys row state (selection, expansion, pinning) by this id rather than by
   * row index. Mirrors TanStack's `getRowId` option.
   */
  kjGetRowId = input<((row: TData, index: number) => string) | undefined>(undefined);

  private readonly _state = signal<KjTableState>(DEFAULT_STATE);

  /**
   * The full table state as a single deep signal. Call `state()` for the
   * whole snapshot, or read any slice (`state.sorting()`, `state.pagination()`,
   * `state.density()`…) as an individual `Signal<T>` — child signals are
   * lazily memoised so each only invalidates on its own slice's change.
   */
  readonly state: DeepSignal<KjTableState> = toDeepSignal(this._state.asReadonly());

  /**
   * Transient column-resize tracker. Updated continuously by TanStack while
   * the user drags a resize handle and read by the styled wrapper to render
   * a preview guide line. Excluded from `state` so it never gets persisted
   * or echoed through `(stateChange)`.
   */
  private readonly _columnSizingInfo = signal<ColumnSizingInfoState>(DEFAULT_RESIZE_INFO);
  readonly columnSizingInfo = this._columnSizingInfo.asReadonly();

  /**
   * Manual-pagination + total-row-count wiring for server-driven tables.
   * When `rowCount` is set to a non-null value, the wrapper assumes the
   * loader pages rows externally — TanStack stops paginating client-side
   * and the pagination / status-bar slots derive their totals from the
   * remote count. Set both via `setRowCount(total)` and read them through
   * the public `rowCount` / `manualPagination` signals if you need them.
   */
  private readonly _rowCount = signal<number | null>(null);
  readonly rowCount = this._rowCount.asReadonly();
  readonly manualPagination = computed(() => this._rowCount() !== null);
  setRowCount(n: number | null): void {
    this._rowCount.set(n);
  }

  /**
   * Apply a TanStack updater (value or function) to a single state slice.
   *
   * Dedupes content-equal updates: TanStack often calls `on*Change` with a
   * fresh object literal that has identical fields (e.g. pagination emits
   * `{pageIndex:0, pageSize:25}` on data ingestion). Without dedupe, the
   * state signal invalidates on every such call, which cascades into
   * `(stateChange)` consumers that drive `kjTableResource` — creating an
   * infinite loader loop where the spinner never goes away.
   */
  private patch<K extends keyof KjTableState>(
    key: K,
    updater: KjTableState[K] | ((prev: KjTableState[K]) => KjTableState[K]),
  ): void {
    this._state.update(s => {
      const next = typeof updater === 'function'
        ? (updater as (p: KjTableState[K]) => KjTableState[K])(s[key])
        : updater;
      if (sliceEqual(s[key], next)) return s;
      return { ...s, [key]: next };
    });
  }

  /** The TanStack table instance. Access rows, headers, and state here. */
  readonly table: () => Table<TData> = createAngularTable<TData>(() => ({
    data: this.kjTableData(),
    columns: this.kjTable(),
    getRowId: this.kjGetRowId()
      ? (row, index) => this.kjGetRowId()!(row, index)
      : undefined,
    // `columnResizeMode: 'onEnd'` defers the actual column width write until
    // the user releases the resize handle. While dragging, the wrapper reads
    // `state.columnSizingInfo().deltaOffset` to render a vertical preview
    // guide so the user sees where the new edge will land before reflow.
    columnResizeMode: 'onEnd',
    // Server-mode wiring: when a total `rowCount` is registered, switch
    // TanStack to manual pagination so the loader-page becomes the
    // visible page (no client-side slicing) and pagination controls
    // derive their totals from the remote count.
    manualPagination: this._rowCount() !== null,
    rowCount: this._rowCount() ?? undefined,
    state: { ...this._state(), columnSizingInfo: this._columnSizingInfo() },
    onSortingChange:          u => this.patch('sorting', u),
    onColumnFiltersChange:    u => this.patch('columnFilters', u),
    onGlobalFilterChange:     u => this.patch('globalFilter', u),
    onPaginationChange:       u => this.patch('pagination', u),
    onRowSelectionChange:     u => this.patch('rowSelection', u),
    onColumnSizingChange:     u => this.patch('columnSizing', u),
    onColumnSizingInfoChange: u => this._columnSizingInfo.update(p => typeof u === 'function' ? (u as (prev: ColumnSizingInfoState) => ColumnSizingInfoState)(p) : u),
    onColumnVisibilityChange: u => this.patch('columnVisibility', u),
    onColumnOrderChange:      u => this.patch('columnOrder', u),
    onColumnPinningChange:    u => this.patch('columnPinning', u),
    onExpandedChange:         u => this.patch('expanded', u),
    onGroupingChange:         u => this.patch('grouping', u),
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel:   getExpandedRowModel(),
    getGroupedRowModel:    getGroupedRowModel(),
    // Selection is enabled by default in TanStack, but be explicit so a
    // future opts-passthrough doesn't accidentally turn it off and break
    // the styled wrapper's row-click toggle.
    enableRowSelection:      true,
    enableMultiRowSelection: true,
  }));

  /** Merge a partial state. Unspecified slices are left untouched. */
  setState(partial: Partial<KjTableState>): void {
    this._state.update(s => ({ ...s, ...partial }));
  }

  /** Reset every slice back to the directive's default state. */
  resetState(): void { this._state.set(DEFAULT_STATE); }

  // ── Public API surface (AG-Grid-style) ─────────────────────────────────
  // Built lazily on first read so the TanStack table getter and the state
  // signal are already wired when callers touch the api.

  private _api?: { gridApi: KjGridApi<TData>; columnApi: KjColumnApi<TData> };
  private buildApi(): { gridApi: KjGridApi<TData>; columnApi: KjColumnApi<TData> } {
    return this._api ??= createGridApi<TData>({
      state: this._state.asReadonly(),
      table: this.table,
      patch: (key, updater) => this.patch(key, updater),
      setStateInternal: this._state.update.bind(this._state),
      resetState: () => this.resetState(),
      defaultState: DEFAULT_STATE,
    });
  }

  /**
   * Grid-wide imperative API — selection, sorting, filtering, pagination,
   * expansion, grouping, density, bulk state. Stable across grid lifetime.
   * Passed to custom filter/editor components via their params object so
   * user code never has to reach into TanStack or the directive directly.
   */
  get gridApi(): KjGridApi<TData> { return this.buildApi().gridApi; }

  /**
   * Per-column imperative API — visibility, width, pinning, order, grouping.
   * Mirrors AG-Grid's `ColumnApi`. Passed alongside `gridApi` to custom
   * filter/editor components.
   */
  get columnApi(): KjColumnApi<TData> { return this.buildApi().columnApi; }
}

/**
 * Shallow-equality check tuned for `KjTableState` slices — plain objects,
 * primitive arrays, and primitives. Returns `true` when `a` and `b` are
 * structurally identical at one level (object keys + values compared with
 * `Object.is`; arrays element-wise the same way). Falls back to `Object.is`
 * for non-object types. Cheap enough to run on every `patch()`.
 */
function sliceEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const av = a[i];
      const bv = b[i];
      if (Object.is(av, bv)) continue;
      // Sorting / column-filter entries are plain objects — one-level deep.
      if (av && bv && typeof av === 'object' && typeof bv === 'object') {
        if (!sliceEqual(av, bv)) return false;
      } else {
        return false;
      }
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const av = ao[k];
    const bv = bo[k];
    if (Object.is(av, bv)) continue;
    // columnPinning has `{ left: string[], right: string[] }` — recurse one level.
    if (Array.isArray(av) || (av && typeof av === 'object')) {
      if (!sliceEqual(av, bv)) return false;
    } else {
      return false;
    }
  }
  return true;
}
