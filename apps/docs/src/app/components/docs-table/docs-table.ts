import { Component, computed, input } from '@angular/core';
import { createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { KjTableDirective, KjTableHeaderDirective } from '@kouji-ui/core';

export interface DocsTableColumn {
  key: string;
  header: string;
}

@Component({
  selector: 'docs-table',
  standalone: true,
  imports: [KjTableDirective, KjTableHeaderDirective],
  templateUrl: './docs-table.html',
  styleUrl: './docs-table.css',
})
export class DocsTableComponent {
  readonly columns = input.required<DocsTableColumn[]>();
  readonly rows    = input.required<Record<string, unknown>[]>();

  private readonly ch = createColumnHelper<Record<string, unknown>>();

  readonly columnDefs = computed((): ColumnDef<Record<string, unknown>>[] =>
    this.columns().map(col =>
      this.ch.accessor(row => row[col.key], {
        id: col.key,
        header: col.header,
        enableSorting: false,
      })
    )
  );
}
