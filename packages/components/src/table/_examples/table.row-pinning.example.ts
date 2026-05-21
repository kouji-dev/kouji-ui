import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Row pinning — `[kjEnableRowPinning]="true"` splits the table body into
 * top / center / bottom buckets. Rows `1` and `2` are pinned to the top and
 * row `5` is pinned to the bottom via TanStack's `setRowPinning(...)` API,
 * called inside `afterNextRender` so the underlying table instance exists.
 *
 */
@Component({
  selector: 'kj-table-row-pinning-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table
      [kjData]="rows()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      [kjEnableRowPinning]="true"
    />
  `,
})
export class KjTableRowPinningExample {
  protected readonly getRowId = (r: User): string => r.id;

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ accessorKey: 'id',    header: 'ID' }),
    kjColumn<User>({ accessorKey: 'name',  header: 'Name' }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ accessorKey: 'role',  header: 'Role' }),
  ];

  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'admin'  },
    { id: '2', name: 'Bob Lin',    email: 'bob@example.com',   role: 'editor' },
    { id: '3', name: 'Carla Diaz', email: 'carla@example.com', role: 'viewer' },
    { id: '4', name: 'Dan Park',   email: 'dan@example.com',   role: 'editor' },
    { id: '5', name: 'Eve Tran',   email: 'eve@example.com',   role: 'admin'  },
    { id: '6', name: 'Frank Ng',   email: 'frank@example.com', role: 'viewer' },
  ]);

  private readonly tableCmp = viewChild.required(KjTableComponent);

  constructor() {
    // `KjTableState` doesn't include rowPinning, so we drive it through the
    // TanStack instance directly once the view has been created.
    afterNextRender(() => {
      this.tableCmp().tableRef().table().setRowPinning({
        top: ['1', '2'],
        bottom: ['5'],
      });
    });
  }
}
