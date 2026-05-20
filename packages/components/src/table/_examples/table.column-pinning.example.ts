import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  joined: string;
  status: string;
  salary: number;
  actions: string;
}

/**
 * Column pinning — the `id` column is pinned left and the `actions` column is
 * pinned right via `kjPin`. Unpinned columns between them scroll horizontally
 * inside the table viewport while pinned columns stay fixed.
 *
 */
@Component({
  selector: 'kj-table-column-pinning-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`
    :host { display: block; }
    .kj-table-body { overflow-x: auto; }
  `],
  template: `
    <kj-table [kjData]="rows()" [kjColumns]="cols" [kjGetRowId]="getRowId" />
  `,
})
export class KjTableColumnPinningExample {
  protected readonly getRowId = (r: User): string => r.id;

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ accessorKey: 'id',      header: 'ID',      kjPin: 'left'  }),
    kjColumn<User>({ accessorKey: 'name',    header: 'Name'   }),
    kjColumn<User>({ accessorKey: 'email',   header: 'Email'  }),
    kjColumn<User>({ accessorKey: 'role',    header: 'Role'   }),
    kjColumn<User>({ accessorKey: 'joined',  header: 'Joined' }),
    kjColumn<User>({ accessorKey: 'status',  header: 'Status' }),
    kjColumn<User>({ accessorKey: 'salary',  header: 'Salary' }),
    kjColumn<User>({ accessorKey: 'actions', header: 'Actions', kjPin: 'right' }),
  ];

  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'admin',  joined: '2024-01-15', status: 'active',  salary: 95000, actions: '⋯' },
    { id: '2', name: 'Bob Lin',    email: 'bob@example.com',   role: 'editor', joined: '2024-03-22', status: 'active',  salary: 72000, actions: '⋯' },
    { id: '3', name: 'Carla Diaz', email: 'carla@example.com', role: 'viewer', joined: '2024-05-10', status: 'invited', salary: 58000, actions: '⋯' },
    { id: '4', name: 'Dan Park',   email: 'dan@example.com',   role: 'editor', joined: '2024-06-01', status: 'active',  salary: 74000, actions: '⋯' },
  ]);
}
