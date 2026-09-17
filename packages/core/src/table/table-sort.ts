import { DestroyRef, Directive, inject } from '@angular/core';
import { KjTableHeader } from './table-header';

/**
 * Turns a `<button>` inside a `[kjTableHeader]` cell into the column's sort
 * control. The button is the Tab stop and carries the accessible name (its
 * text — the column label); the surrounding `<th>` keeps `aria-sort` and
 * drops out of the Tab order while the button is present.
 *
 * Click, Enter and Space toggle the sort; Shift adds the column as a
 * secondary sort when the table allows multi-sort.
 *
 * @example
 * ```html
 * <th kjTableHeader [kjHeader]="header" scope="col">
 *   <button kjTableSort>Name</button>
 * </th>
 * ```
 */
@Directive({
  selector: 'button[kjTableSort]',
  standalone: true,
  host: {
    'type': 'button',
    '(click)': 'onClick($event)',
  },
})
export class KjTableSort {
  private readonly header = inject(KjTableHeader);

  constructor() {
    const release = this.header.registerSortControl();
    inject(DestroyRef).onDestroy(release);
  }

  /** @internal */
  onClick(event: MouseEvent): void {
    this.header.toggleSort(event.shiftKey);
  }
}
