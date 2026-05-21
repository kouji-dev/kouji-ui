import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjTableToolbarComponent, KjBulkAction } from '../table-toolbar';
import { KjTableStatusBarComponent } from '../table-status-bar';
import { KjButtonComponent } from '../../button/button';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  joined: string;
}

/**
 * Multi-row selection — `kjSelectionMode="multi"` enables row-toggle interaction
 * (click + Space / Shift+click). The status bar shows the selected count and the
 * toolbar reveals a bulk-action button once any row is selected.
 */
@Component({
  selector: 'kj-table-selection-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjTableComponent,
    KjTableToolbarComponent,
    KjTableStatusBarComponent,
    KjBulkAction,
    KjButtonComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table
      [kjData]="rows()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      kjSelectionMode="multi"
    >
      <kj-table-toolbar kjToolbar>
        <kj-button kjBulkAction kjVariant="destructive" kjSize="sm">Delete selected</kj-button>
      </kj-table-toolbar>
      <kj-table-status-bar />
    </kj-table>
  `,
})
export class KjTableSelectionExample {
  protected readonly rows = signal<User[]>([
    { id: '1',  name: 'Alice Chen',   email: 'alice@example.com',  role: 'admin',  joined: '2024-01-15' },
    { id: '2',  name: 'Bob Diaz',     email: 'bob@example.com',    role: 'editor', joined: '2024-02-03' },
    { id: '3',  name: 'Carol Evans',  email: 'carol@example.com',  role: 'viewer', joined: '2024-03-22' },
    { id: '4',  name: 'Dan Fischer',  email: 'dan@example.com',    role: 'editor', joined: '2024-04-10' },
    { id: '5',  name: 'Eve Garcia',   email: 'eve@example.com',    role: 'admin',  joined: '2024-05-30' },
    { id: '6',  name: 'Frank Hughes', email: 'frank@example.com',  role: 'viewer', joined: '2024-06-12' },
    { id: '7',  name: 'Grace Ito',    email: 'grace@example.com',  role: 'admin',  joined: '2024-07-04' },
    { id: '8',  name: 'Henry Jones',  email: 'henry@example.com',  role: 'editor', joined: '2024-08-19' },
  ]);

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name',   accessorKey: 'name',   header: 'Name'   }),
    kjColumn<User>({ id: 'email',  accessorKey: 'email',  header: 'Email'  }),
    kjColumn<User>({ id: 'role',   accessorKey: 'role',   header: 'Role'   }),
    kjColumn<User>({ id: 'joined', accessorKey: 'joined', header: 'Joined' }),
  ];

  protected readonly getRowId = (row: User): string => row.id;
}
