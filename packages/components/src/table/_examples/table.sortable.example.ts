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
 * Sortable columns — click a sortable header to toggle ASC / DESC / unsorted.
 * The `role` column has `enableSorting: false` to show the opt-out.
 */
@Component({
  selector: 'kj-table-sortable-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table [kjData]="rows()" [kjColumns]="cols" [kjGetRowId]="getRowId" />
  `,
})
export class KjTableSortableExample {
  protected readonly rows = signal<User[]>([
    { id: '1',  name: 'Alice Chen',  email: 'alice@example.com',  role: 'admin',  joined: '2024-01-15' },
    { id: '2',  name: 'Bob Diaz',    email: 'bob@example.com',    role: 'editor', joined: '2024-02-03' },
    { id: '3',  name: 'Carol Evans', email: 'carol@example.com',  role: 'viewer', joined: '2024-03-22' },
    { id: '4',  name: 'Dan Fischer', email: 'dan@example.com',    role: 'editor', joined: '2024-04-10' },
    { id: '5',  name: 'Eve Garcia',  email: 'eve@example.com',    role: 'admin',  joined: '2024-05-30' },
    { id: '6',  name: 'Frank Hughes',email: 'frank@example.com',  role: 'viewer', joined: '2024-06-12' },
    { id: '7',  name: 'Grace Ito',   email: 'grace@example.com',  role: 'admin',  joined: '2024-07-04' },
    { id: '8',  name: 'Henry Jones', email: 'henry@example.com',  role: 'editor', joined: '2024-08-19' },
    { id: '9',  name: 'Iris Kim',    email: 'iris@example.com',   role: 'viewer', joined: '2024-09-01' },
    { id: '10', name: 'Jack Liu',    email: 'jack@example.com',   role: 'editor', joined: '2024-10-25' },
  ]);

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name',   accessorKey: 'name',   header: 'Name',   enableSorting: true  }),
    kjColumn<User>({ id: 'email',  accessorKey: 'email',  header: 'Email',  enableSorting: true  }),
    kjColumn<User>({ id: 'role',   accessorKey: 'role',   header: 'Role',   enableSorting: false }),
    kjColumn<User>({ id: 'joined', accessorKey: 'joined', header: 'Joined', enableSorting: true  }),
  ];

  protected readonly getRowId = (row: User): string => row.id;
}
