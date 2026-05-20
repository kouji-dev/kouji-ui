import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Column resizing — drag the handle on the right edge of any `<th>` to resize
 * that column. `[kjEnableResize]="true"` opts the table into resize mode and
 * renders the handles via the underlying TanStack column-sizing model.
 *
 */
@Component({
  selector: 'kj-table-column-resize-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table
      [kjData]="rows()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      [kjEnableResize]="true"
    />
  `,
})
export class KjTableColumnResizeExample {
  protected readonly getRowId = (r: User): string => r.id;

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ accessorKey: 'id',    header: 'ID',    size: 80,  enableResizing: true }),
    kjColumn<User>({ accessorKey: 'name',  header: 'Name',  size: 180, enableResizing: true }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email', size: 240, enableResizing: true }),
    kjColumn<User>({ accessorKey: 'role',  header: 'Role',  size: 120, enableResizing: true }),
  ];

  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'admin'  },
    { id: '2', name: 'Bob Lin',    email: 'bob@example.com',   role: 'editor' },
    { id: '3', name: 'Carla Diaz', email: 'carla@example.com', role: 'viewer' },
    { id: '4', name: 'Dan Park',   email: 'dan@example.com',   role: 'editor' },
  ]);
}
