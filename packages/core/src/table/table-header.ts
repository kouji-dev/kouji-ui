import { Directive, computed, inject, input } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';
import { KJ_TABLE } from './table';

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

  private readonly _table = inject(KJ_TABLE, { optional: true });

  /** Whether this column supports sorting, derived from TanStack column state. */
  readonly canSort = computed(() => this.kjHeader()?.column.getCanSort() ?? false);

  /** Current sort direction, or null when unsorted. */
  readonly sortDir = computed((): KjSortDirection | null => {
    // Track parent table sorting signal so this computed re-runs on sort changes.
    this._table?.state.sorting();
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
