import {
  ColumnDef,
  RowData,
  SortingState,
  createAngularTable,
  getCoreRowModel,
  getSortedRowModel,
  type Table,
} from '@tanstack/angular-table';
import { Directive, InjectionToken, computed, input, signal } from '@angular/core';

/** Injection token providing the TanStack table instance to child directives. */
export const KJ_TABLE = new InjectionToken<KjTable<unknown>>('KjTable');

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
 * @category Core/Data
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

  private readonly _sorting = signal<SortingState>([]);

  /** The TanStack table instance. Access rows, headers, and state here. */
  readonly table: () => Table<TData> = createAngularTable<TData>(() => ({
    data: this.kjTableData(),
    columns: this.kjTable(),
    state: { sorting: this._sorting() },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this._sorting()) : updater;
      this._sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  }));

  /** Current sorting state as a signal. */
  readonly sorting = this._sorting.asReadonly();
}

/** Sort direction for table columns. */
export type KjSortDirection = 'asc' | 'desc';

/**
 * Marks a `<th>` as a sortable column header. Sets `aria-sort` based on TanStack sort state.
 * Clicking toggles sort direction only when the column has sorting enabled.
 * If `enableSorting: false` is set on the column def, the header renders as plain text.
 *
 * @example
 * ```html
 * <th kjTableHeader [kjHeader]="header" scope="col">Name</th>
 * ```
 * @category Core/Data
 * @doc
 * @doc-name table
 */
@Directive({
  selector: '[kjTableHeader]',
  standalone: true,
  host: {
    '[style.cursor]':   'canSort() ? "pointer" : null',
    '[attr.tabindex]':  'canSort() ? "0" : null',
    '[attr.aria-sort]': 'canSort() ? ariaSort() : null',
    '[attr.data-sort]': 'canSort() ? sortDir() : null',
    '(click)':          'onHeaderClick()',
    '(keydown.enter)':  'onHeaderClick()',
    '(keydown.space)':  '$event.preventDefault(); onHeaderClick()',
  },
})
export class KjTableHeader<TData extends RowData = unknown> {
  /** The TanStack header object for this column. Pass from the table's getHeaderGroups(). */
  kjHeader = input<ReturnType<Table<TData>['getHeaderGroups']>[0]['headers'][0] | undefined>(undefined);

  /** Whether this column supports sorting, derived from TanStack column state. */
  readonly canSort = computed(() => this.kjHeader()?.column.getCanSort() ?? false);

  /** Current sort direction, or null when unsorted. */
  readonly sortDir = computed((): KjSortDirection | null => {
    const h = this.kjHeader();
    if (!h) return null;
    const sorted = h.column.getIsSorted();
    if (sorted === 'asc') return 'asc';
    if (sorted === 'desc') return 'desc';
    return null;
  });

  /** ARIA sort attribute value derived from sort direction. */
  readonly ariaSort = computed(() => {
    const d = this.sortDir();
    if (d === 'asc')  return 'ascending';
    if (d === 'desc') return 'descending';
    return 'none';
  });

  onHeaderClick(): void {
    if (this.canSort()) this.kjHeader()?.column.toggleSorting();
  }
}
