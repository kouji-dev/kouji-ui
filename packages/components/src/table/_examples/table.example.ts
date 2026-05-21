import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  joined: string;
}

/**
 * Default table — three columns, five rows, no options. The minimal
 * copy-paste starting point.
 * @doc-example
 * @doc-name table
 */
@Component({
  selector: 'kj-table-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table [kjData]="rows()" [kjColumns]="cols" [kjGetRowId]="getRowId" />
  `,
})
export class KjTableExample {
  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen',  email: 'alice@example.com',  role: 'admin',  joined: '2024-01-15' },
    { id: '2', name: 'Bob Diaz',    email: 'bob@example.com',    role: 'editor', joined: '2024-02-03' },
    { id: '3', name: 'Carol Evans', email: 'carol@example.com',  role: 'viewer', joined: '2024-03-22' },
    { id: '4', name: 'Dan Fischer', email: 'dan@example.com',    role: 'editor', joined: '2024-04-10' },
    { id: '5', name: 'Eve Garcia',  email: 'eve@example.com',    role: 'admin',  joined: '2024-05-30' },
  ]);

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name',  accessorKey: 'name',  header: 'Name'  }),
    kjColumn<User>({ id: 'email', accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ id: 'role',  accessorKey: 'role',  header: 'Role'  }),
  ];

  protected readonly getRowId = (row: User): string => row.id;
}
