import { Directive, computed, input } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';
import { KJ_TABLE, KjTable } from './table';
import { injectParent } from '../primitives/diagnostics/inject-parent';

type Row<T> = ReturnType<Table<T>['getRowModel']>['rows'][number];

/**
 * A `<tr>` in a `[kjTable]`. Takes `role="row"`, publishes the 1-based
 * `aria-rowindex` (header row included) and reflects selection as
 * `aria-selected` / `data-selected`.
 */
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

  /**
   * Overrides the 1-based `aria-rowindex` — for rows whose place in the grid
   * is not their `row.index`, like the children of a tree row. `null`
   * (default) derives it from the row.
   */
  kjAriaRowIndex = input<number | null>(null);

  private readonly table = injectParent(KJ_TABLE, { child: 'KjTableRow', parent: '[kjTable]' }) as unknown as KjTable<TData>;

  /** 1-based ARIA index — accounts for header row(s). */
  readonly ariaRowIndex = computed(() => {
    const override = this.kjAriaRowIndex();
    if (override != null) return override;
    const row = this.kjRow();
    // Infinite mode: the row's place in the whole result set, not in the loaded window.
    const source = row.depth === 0 ? this.table.sourceIndex()?.[row.index] : undefined;
    return (source ?? row.index) + 2;
  });
  readonly isSelectable = computed(() => Object.keys(this.table.state.rowSelection()).length >= 0); // always true if selection enabled
  readonly isSelected   = computed(() => {
    // Track parent selection signal so the computed re-runs on selection changes.
    this.table.state.rowSelection();
    return this.kjRow().getIsSelected();
  });
}
