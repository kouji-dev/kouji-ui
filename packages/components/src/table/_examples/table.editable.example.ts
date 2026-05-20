import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent, type KjCellEditEvent } from '../table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  salary: number;
}

/**
 * Inline editing — double-click a cell to mount its editor. Enter commits,
 * Escape cancels. The `role` column uses a select editor; `salary` uses a
 * number editor; `name` and `email` use text editors.
 *
 */
@Component({
  selector: 'kj-table-editable-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table
      [kjData]="rows()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      [kjEditOnDoubleClick]="true"
      (cellEdit)="onEdit($any($event))"
    />
  `,
})
export class KjTableEditableExample {
  protected readonly getRowId = (r: User): string => r.id;

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ accessorKey: 'id', header: 'ID' }),
    kjColumn<User>({
      accessorKey: 'name',
      header: 'Name',
      kjEditable: true,
      kjType: 'text',
    }),
    kjColumn<User>({
      accessorKey: 'email',
      header: 'Email',
      kjEditable: true,
      kjType: 'text',
    }),
    kjColumn<User>({
      accessorKey: 'role',
      header: 'Role',
      kjEditable: true,
      kjType: 'select',
      kjSelectOptions: [
        { value: 'admin', label: 'Admin' },
        { value: 'editor', label: 'Editor' },
        { value: 'viewer', label: 'Viewer' },
      ],
    }),
    kjColumn<User>({
      accessorKey: 'salary',
      header: 'Salary',
      kjEditable: true,
      kjType: 'number',
    }),
  ];

  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen',  email: 'alice@example.com',  role: 'admin',  salary: 95000 },
    { id: '2', name: 'Bob Lin',     email: 'bob@example.com',    role: 'editor', salary: 72000 },
    { id: '3', name: 'Carla Diaz',  email: 'carla@example.com',  role: 'viewer', salary: 58000 },
    { id: '4', name: 'Dan Park',    email: 'dan@example.com',    role: 'editor', salary: 74000 },
  ]);

  protected onEdit(event: KjCellEditEvent<User>): void {
    this.rows.update(rs =>
      rs.map(r =>
        r.id === event.row.id ? { ...r, [event.columnId]: event.newValue } : r,
      ),
    );
  }
}
