import { Directive, computed, inject, input } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';
import { KJ_TABLE, KjTable } from './table';

type Row<T> = ReturnType<Table<T>['getRowModel']>['rows'][number];

@Directive({
  selector: '[kjTableRow]',
  standalone: true,
  host: {
    'role': 'row',
    '[attr.aria-rowindex]':  'ariaRowIndex()',
    '[attr.aria-selected]':  'isSelectable() ? isSelected() : null',
    '[attr.data-selected]':  'isSelected() ? "" : null',
  },
})
export class KjTableRow<TData extends RowData = unknown> {
  /** TanStack row instance — pass from getRowModel().rows. */
  kjRow = input.required<Row<TData>>();

  private readonly table = inject(KJ_TABLE) as unknown as KjTable<TData>;

  /** 1-based ARIA index — accounts for header row(s). */
  readonly ariaRowIndex = computed(() => this.kjRow().index + 2);
  readonly isSelectable = computed(() => Object.keys(this.table.rowSelection()).length >= 0); // always true if selection enabled
  readonly isSelected   = computed(() => {
    // Track parent selection signal so the computed re-runs on selection changes.
    this.table.rowSelection();
    return this.kjRow().getIsSelected();
  });
}
