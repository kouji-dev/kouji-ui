import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjTableToolbarComponent } from '../table-toolbar';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  joined: string;
  status: string;
}

/**
 * Column visibility — the toolbar exposes a built-in visibility menu listing
 * every leaf column with a checkbox. Toggling writes `columnVisibility` into
 * the table state, hiding columns instantly.
 *
 */
@Component({
  selector: 'kj-table-column-visibility-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent, KjTableToolbarComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table [kjData]="rows()" [kjColumns]="cols" [kjGetRowId]="getRowId">
      <kj-table-toolbar kjToolbar />
    </kj-table>
  `,
})
export class KjTableColumnVisibilityExample {
  protected readonly getRowId = (r: User): string => r.id;

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ accessorKey: 'id',     header: 'ID' }),
    kjColumn<User>({ accessorKey: 'name',   header: 'Name' }),
    kjColumn<User>({ accessorKey: 'email',  header: 'Email' }),
    kjColumn<User>({ accessorKey: 'role',   header: 'Role' }),
    kjColumn<User>({ accessorKey: 'joined', header: 'Joined' }),
    kjColumn<User>({ accessorKey: 'status', header: 'Status' }),
  ];

  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'admin',  joined: '2024-01-15', status: 'active' },
    { id: '2', name: 'Bob Lin',    email: 'bob@example.com',   role: 'editor', joined: '2024-03-22', status: 'active' },
    { id: '3', name: 'Carla Diaz', email: 'carla@example.com', role: 'viewer', joined: '2024-05-10', status: 'invited' },
    { id: '4', name: 'Dan Park',   email: 'dan@example.com',   role: 'editor', joined: '2024-06-01', status: 'active' },
    { id: '5', name: 'Eve Tran',   email: 'eve@example.com',   role: 'admin',  joined: '2024-07-18', status: 'paused' },
  ]);
}
