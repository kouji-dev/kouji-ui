import { Directive, ElementRef, computed, inject, input, signal } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';
import { KJ_TABLE } from './table';

/** Sort direction for table columns. */
export type KjSortDirection = 'asc' | 'desc';

/**
 * Marks a `<th>` as a column header. Sets `aria-sort` from TanStack sort state
 * and toggles the sort when the header is activated, but only when the column
 * has sorting enabled. With `enableSorting: false` on the column def the header
 * renders as plain text.
 *
 * Put a `<button kjTableSort>` inside the cell for the sort affordance
 * (WAI-ARIA sortable-table pattern): the button is the focusable control with
 * a real name, the `<th>` keeps `aria-sort` and stays out of the Tab order.
 * Clicking the cell outside the button still toggles the sort. Shift-click
 * (or Shift+Enter on the button) adds the column as a secondary sort.
 *
 * Without a sort button the `<th>` itself becomes the focusable control
 * (Enter / Space toggle) — kept for backwards compatibility; screen readers
 * then announce a column header with no action name, so prefer the button.
 *
 * @example
 * ```html
 * <th kjTableHeader [kjHeader]="header" scope="col">
 *   <button kjTableSort>Name</button>
 * </th>
 * ```
 */
@Directive({
  selector: '[kjTableHeader]',
  standalone: true,
  host: {
    '[style.cursor]':   'canSort() ? "pointer" : null',
    '[attr.tabindex]':  'canSort() && !hasSortControl() ? "0" : null',
    '[attr.aria-sort]': 'canSort() ? ariaSort() : null',
    '[attr.data-sort]': 'canSort() ? sortDir() : null',
    '(click)':          'onHeaderClick($event)',
    '(keydown)':        'onKeydown($event)',
  },
})
export class KjTableHeader<TData extends RowData = unknown> {
  /** The TanStack header object for this column. Pass from the table's getHeaderGroups(). */
  kjHeader = input<ReturnType<Table<TData>['getHeaderGroups']>[0]['headers'][0] | undefined>(undefined);

  private readonly _table = inject(KJ_TABLE, { optional: true });
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly _hasSortControl = signal(false);

  /** Whether this column supports sorting, derived from TanStack column state. */
  readonly canSort = computed(() => this.kjHeader()?.column.getCanSort() ?? false);

  /** Whether a `[kjTableSort]` button inside the cell owns activation. */
  readonly hasSortControl = this._hasSortControl.asReadonly();

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

  /**
   * Cycle the column's sort (asc → desc → none). No-op when the column is not sortable.
   * @param multi Keep the existing sort and add this column after it.
   */
  toggleSort(multi = false): void {
    if (!this.canSort()) return;
    const column = this.kjHeader()?.column;
    if (!column) return;
    column.toggleSorting(undefined, multi && column.getCanMultiSort());
  }

  /** @internal Register a `[kjTableSort]` button; returns the release callback. */
  registerSortControl(): () => void {
    this._hasSortControl.set(true);
    return () => this._hasSortControl.set(false);
  }

  /** Pointer activation of the cell; a click that started on the sort button is the button's. */
  onHeaderClick(event?: MouseEvent): void {
    const target = event?.target as HTMLElement | null | undefined;
    if (this.hasSortControl() && target?.closest('[kjTableSort]')) return;
    this.toggleSort(event?.shiftKey ?? false);
  }

  /** @internal Enter / Space on the focusable cell (legacy mode without a sort button). */
  onKeydown(event: KeyboardEvent): void {
    if (this.hasSortControl() || event.target !== this.host) return;
    if (event.key === 'Enter') {
      this.toggleSort(event.shiftKey);
    } else if (event.key === ' ') {
      event.preventDefault();
      this.toggleSort(event.shiftKey);
    }
  }
}
