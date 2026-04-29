import { Directive, computed, input } from '@angular/core';

/** Sort direction for a table column header. */
export type KjSortDirection = 'asc' | 'desc' | 'none';

/** Marks a `<table>` element as a kouji-ui data table. */
@Directive({ selector: '[kjTable]', standalone: true })
export class KjTableDirective {}

/**
 * Sortable column header. Sets `aria-sort` based on direction.
 * @example `<th kjTableHeader scope="col" [kjSortDirection]="dir">Name</th>`
 */
@Directive({
  selector: '[kjTableHeader]', standalone: true,
  host: { '[attr.aria-sort]': 'ariaSort()', '[attr.data-sort]': 'kjSortDirection()' },
})
export class KjTableHeaderDirective {
  /** Current sort direction. Defaults to `'none'`. */
  kjSortDirection = input<KjSortDirection>('none');
  readonly ariaSort = computed(() => {
    const d = this.kjSortDirection();
    if (d === 'asc') return 'ascending';
    if (d === 'desc') return 'descending';
    return null;
  });
}

/** Marks a `<tr>` as a data row. */
@Directive({ selector: '[kjTableRow]', standalone: true, host: { '[attr.data-row]': '""' } })
export class KjTableRowDirective {}

/** Marks a `<td>` as a data cell. */
@Directive({ selector: '[kjTableCell]', standalone: true, host: { '[attr.data-cell]': '""' } })
export class KjTableCellDirective {}
