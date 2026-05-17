import {
  ColumnDef, RowData, SortingState, ColumnFiltersState, PaginationState,
  RowSelectionState, ColumnSizingState, VisibilityState, ColumnOrderState,
  ColumnPinningState, ExpandedState, GroupingState,
  createAngularTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, getExpandedRowModel, getGroupedRowModel,
  type Table,
} from '@tanstack/angular-table';
import { Directive, InjectionToken, input, signal } from '@angular/core';
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

/**
 * Wraps TanStack Angular Table. Accepts `kjTable` (columns) and `kjTableData` signal inputs and
 * exposes the table instance (rows, headers, sorting) via the `KJ_TABLE` context token.
 *
 * Use `table` to access the full TanStack `Table<T>` instance in templates via `exportAs: 'kjTable'`.
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
 * @doc-category Core/Data
 * @doc
 * @doc-name table
 * @doc-description Builds a TanStack-powered table from column and data inputs and exposes the table instance.
 * @doc-is-main
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

  /** Data rows for the table. */
  kjTableData = input<TData[]>([]);

  private readonly _sorting           = signal<SortingState>(DEFAULT_STATE.sorting);
  private readonly _columnFilters     = signal<ColumnFiltersState>(DEFAULT_STATE.columnFilters);
  private readonly _globalFilter      = signal(DEFAULT_STATE.globalFilter);
  private readonly _pagination        = signal<PaginationState>(DEFAULT_STATE.pagination);
  private readonly _rowSelection      = signal<RowSelectionState>(DEFAULT_STATE.rowSelection);
  private readonly _columnSizing      = signal<ColumnSizingState>(DEFAULT_STATE.columnSizing);
  private readonly _columnVisibility  = signal<VisibilityState>(DEFAULT_STATE.columnVisibility);
  private readonly _columnOrder       = signal<ColumnOrderState>(DEFAULT_STATE.columnOrder);
  private readonly _columnPinning     = signal<ColumnPinningState>(DEFAULT_STATE.columnPinning);
  private readonly _expanded          = signal<ExpandedState>(DEFAULT_STATE.expanded);
  private readonly _grouping          = signal<GroupingState>(DEFAULT_STATE.grouping);
  private readonly _density           = signal<'compact' | 'standard' | 'comfortable'>(DEFAULT_STATE.density);

  readonly sorting          = this._sorting.asReadonly();
  readonly columnFilters    = this._columnFilters.asReadonly();
  readonly globalFilter     = this._globalFilter.asReadonly();
  readonly pagination       = this._pagination.asReadonly();
  readonly rowSelection     = this._rowSelection.asReadonly();
  readonly columnSizing     = this._columnSizing.asReadonly();
  readonly columnVisibility = this._columnVisibility.asReadonly();
  readonly columnOrder      = this._columnOrder.asReadonly();
  readonly columnPinning    = this._columnPinning.asReadonly();
  readonly expanded         = this._expanded.asReadonly();
  readonly grouping         = this._grouping.asReadonly();
  readonly density          = this._density.asReadonly();

  /** The TanStack table instance. Access rows, headers, and state here. */
  readonly table: () => Table<TData> = createAngularTable<TData>(() => ({
    data: this.kjTableData(),
    columns: this.kjTable(),
    state: {
      sorting:          this._sorting(),
      columnFilters:    this._columnFilters(),
      globalFilter:     this._globalFilter(),
      pagination:       this._pagination(),
      rowSelection:     this._rowSelection(),
      columnSizing:     this._columnSizing(),
      columnVisibility: this._columnVisibility(),
      columnOrder:      this._columnOrder(),
      columnPinning:    this._columnPinning(),
      expanded:         this._expanded(),
      grouping:         this._grouping(),
    },
    onSortingChange:          u => set(this._sorting, u),
    onColumnFiltersChange:    u => set(this._columnFilters, u),
    onGlobalFilterChange:     u => set(this._globalFilter, u),
    onPaginationChange:       u => set(this._pagination, u),
    onRowSelectionChange:     u => set(this._rowSelection, u),
    onColumnSizingChange:     u => set(this._columnSizing, u),
    onColumnVisibilityChange: u => set(this._columnVisibility, u),
    onColumnOrderChange:      u => set(this._columnOrder, u),
    onColumnPinningChange:    u => set(this._columnPinning, u),
    onExpandedChange:         u => set(this._expanded, u),
    onGroupingChange:         u => set(this._grouping, u),
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel:   getExpandedRowModel(),
    getGroupedRowModel:    getGroupedRowModel(),
  }));

  getState(): KjTableState {
    return {
      sorting: this._sorting(),
      columnFilters: this._columnFilters(),
      globalFilter: this._globalFilter(),
      pagination: this._pagination(),
      rowSelection: this._rowSelection(),
      columnSizing: this._columnSizing(),
      columnVisibility: this._columnVisibility(),
      columnOrder: this._columnOrder(),
      columnPinning: this._columnPinning(),
      expanded: this._expanded(),
      grouping: this._grouping(),
      density: this._density(),
    };
  }

  setState(partial: Partial<KjTableState>): void {
    if (partial.sorting          !== undefined) this._sorting.set(partial.sorting);
    if (partial.columnFilters    !== undefined) this._columnFilters.set(partial.columnFilters);
    if (partial.globalFilter     !== undefined) this._globalFilter.set(partial.globalFilter);
    if (partial.pagination       !== undefined) this._pagination.set(partial.pagination);
    if (partial.rowSelection     !== undefined) this._rowSelection.set(partial.rowSelection);
    if (partial.columnSizing     !== undefined) this._columnSizing.set(partial.columnSizing);
    if (partial.columnVisibility !== undefined) this._columnVisibility.set(partial.columnVisibility);
    if (partial.columnOrder      !== undefined) this._columnOrder.set(partial.columnOrder);
    if (partial.columnPinning    !== undefined) this._columnPinning.set(partial.columnPinning);
    if (partial.expanded         !== undefined) this._expanded.set(partial.expanded);
    if (partial.grouping         !== undefined) this._grouping.set(partial.grouping);
    if (partial.density          !== undefined) this._density.set(partial.density);
  }

  resetState(): void { this.setState(DEFAULT_STATE); }
}

function set<T>(sig: { set: (v: T) => void; (): T }, updater: T | ((prev: T) => T)): void {
  const next = typeof updater === 'function' ? (updater as (p: T) => T)(sig()) : updater;
  sig.set(next);
}

export { KjTableHeader, type KjSortDirection } from './table-header';
