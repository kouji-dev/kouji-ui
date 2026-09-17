import { Directive, ElementRef, computed, inject, input } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';
import { KJ_TABLE_KEYBOARD_NAV } from './table-keyboard.context';

type Cell<T> = ReturnType<Table<T>['getRowModel']>['rows'][number]['getVisibleCells'] extends () => infer R
  ? R extends Array<infer C> ? C : never : never;

/**
 * Marks a `<td>` as a grid cell: `role="gridcell"`, `aria-colindex`, the pin
 * slot and the roving `tabindex` that makes the grid body reachable by Tab.
 *
 * Inside a `[kjTableKeyboardNav]` grid exactly one rendered cell carries
 * `tabindex="0"` — the cell the user focused last, else the first rendered
 * one — and every other cell `-1`, so Tab enters the grid once and the arrow
 * keys move between cells (WAI-ARIA grid pattern). Without a navigation owner
 * the cell stays at `-1`: focusable by script and pointer, never a Tab stop.
 *
 * @example
 * ```html
 * <td kjTableCell [kjCell]="cell">{{ cell.getValue() }}</td>
 * ```
 */
@Directive({
  selector: '[kjTableCell]',
  standalone: true,
  host: {
    'role': 'gridcell',
    '[attr.aria-colindex]': 'ariaColIndex()',
    '[attr.data-pin]': 'pin()',
    '[attr.tabindex]': 'tabindex()',
    '(focusin)': 'onFocusIn()',
  },
})
export class KjTableCell<TData extends RowData = unknown> {
  /** TanStack cell instance — pass from row.getVisibleCells(). */
  kjCell = input.required<Cell<TData>>();

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly nav = inject(KJ_TABLE_KEYBOARD_NAV, { optional: true });

  /** Public host element handle — used by `KjTableKeyboardNav` to focus cells. */
  get hostElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  /** TanStack cell id (`<rowId>_<columnId>`), stable across re-renders of the same row and column. */
  readonly cellId = computed(() => this.kjCell().id);

  /** 1-based ARIA index for the column. */
  readonly ariaColIndex = computed(() => {
    const cell = this.kjCell() as { column?: { getIndex?: () => number } };
    const idx = cell.column?.getIndex?.();
    return idx != null ? idx + 1 : null;
  });

  readonly pin = computed(() => {
    const cell = this.kjCell() as { column?: { getIsPinned?: () => unknown } };
    return cell.column?.getIsPinned?.() ?? null;
  });

  /** `0` for the grid's single Tab stop, `-1` for every other cell. */
  readonly tabindex = computed(() =>
    this.nav !== null && this.nav.tabStopId() === this.cellId() ? 0 : -1,
  );

  /** @internal */
  onFocusIn(): void {
    this.nav?.setActive(this.cellId());
  }
}
