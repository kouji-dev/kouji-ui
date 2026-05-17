import { Directive, computed, input } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';

type Cell<T> = ReturnType<Table<T>['getRowModel']>['rows'][number]['getVisibleCells'] extends () => infer R
  ? R extends Array<infer C> ? C : never : never;

@Directive({
  selector: '[kjTableCell]',
  standalone: true,
  host: {
    'role': 'gridcell',
    '[attr.aria-colindex]': 'ariaColIndex()',
    '[attr.data-pin]': 'pin()',
  },
})
export class KjTableCell<TData extends RowData = unknown> {
  /** TanStack cell instance — pass from row.getVisibleCells(). */
  kjCell = input.required<Cell<TData>>();

  /** 1-based ARIA index for the column. */
  readonly ariaColIndex = computed(() => {
    const cell = this.kjCell() as any;
    return cell.column?.getIndex?.() != null ? cell.column.getIndex() + 1 : null;
  });

  readonly pin = computed(() => {
    const cell = this.kjCell() as any;
    return cell.column?.getIsPinned?.() ?? null;
  });
}
