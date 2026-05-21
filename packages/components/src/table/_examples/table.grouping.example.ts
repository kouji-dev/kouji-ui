import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface User {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly status: string;
}

const ROWS: User[] = [
  { id: '1', name: 'Alice',  role: 'Admin',   status: 'Active'   },
  { id: '2', name: 'Bob',    role: 'Admin',   status: 'Inactive' },
  { id: '3', name: 'Carol',  role: 'Editor',  status: 'Active'   },
  { id: '4', name: 'Dan',    role: 'Editor',  status: 'Active'   },
  { id: '5', name: 'Eve',    role: 'Viewer',  status: 'Inactive' },
  { id: '6', name: 'Frank',  role: 'Viewer',  status: 'Active'   },
];

/**
 * Grouped rows by `role`. Initial grouping state is seeded via
 * `tableRef.setState({ grouping: ['role'] })` after first render, and we
 * also expand every group so the example demonstrates both the grouped
 * header row (with toggle + count) AND the leaf rows underneath.
 */
@Component({
  selector: 'kj-table-grouping-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table [kjData]="data()" [kjColumns]="cols" />
  `,
})
export class KjTableGroupingExample {
  protected readonly data = signal<User[]>(ROWS);

  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'role',   header: 'Role',   kjGroup: true }),
    kjColumn<User>({ accessorKey: 'name',   header: 'Name'   }),
    kjColumn<User>({ accessorKey: 'status', header: 'Status' }),
  ];

  private readonly tableRef = viewChild.required(KjTableComponent);

  constructor() {
    afterNextRender(() => {
      const tbl = this.tableRef().tableRef();
      tbl.setState({ grouping: ['role'] });
      // Expand every group so leaf rows are visible by default; users can
      // collapse with the chevron toggle on each group row.
      tbl.table().toggleAllRowsExpanded(true);
    });
  }
}
