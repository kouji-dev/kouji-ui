import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { KjTable, KjTableHeader, KjTableSort, KjVisuallyHidden } from '@kouji-ui/core';

export interface DocsTableColumn {
  key: string;
  header: string;
}

@Component({
  selector: 'app-docs-table',
  standalone: true,
  imports: [KjTable, KjTableHeader, KjTableSort, KjVisuallyHidden],
  templateUrl: './docs-table.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './docs-table.css',
})
export class DocsTableComponent {
  readonly columns = input.required<DocsTableColumn[]>();
  readonly rows = input.required<Record<string, unknown>[]>();
  readonly label = input<string>('');

  private readonly ch = createColumnHelper<Record<string, unknown>>();

  readonly columnDefs = computed((): ColumnDef<Record<string, unknown>>[] =>
    this.columns().map((col) =>
      this.ch.accessor((row) => row[col.key], {
        id: col.key,
        header: col.header,
        // Sortable: the API tables on a docs page are long enough that
        // ordering by name or type is useful, and the demo is the reference
        // for `<button kjTableSort>`. `enableSorting: false` would leave the
        // button registered but inert.
        enableSorting: true,
      }),
    ),
  );
}
