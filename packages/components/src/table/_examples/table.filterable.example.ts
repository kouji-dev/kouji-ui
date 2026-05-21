import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';

interface Row {
  id: string;
  name: string;
  score: number;
  role: 'admin' | 'editor' | 'viewer';
  joined: string;
}

/**
 * Filter row enabled via `[kjEnableFilters]="true"`. Four columns exercise
 * the built-in filter UIs — text, number, select, and date.
 */
@Component({
  selector: 'kj-table-filterable-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`
    :host { display: block; }
    /* Container-driven height: the table fills 480px and its body scrolls
       internally — the filter row stays pinned at the top. */
    kj-table { height: 480px; }
  `],
  template: `
    <kj-table
      [kjData]="rows()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      [kjEnableFilters]="true"
    />
  `,
})
export class KjTableFilterableExample {
  protected readonly rows = signal<Row[]>([
    { id: '1',  name: 'Alice Chen',  score: 92, role: 'admin',  joined: '2024-01-15' },
    { id: '2',  name: 'Bob Diaz',    score: 71, role: 'editor', joined: '2024-02-03' },
    { id: '3',  name: 'Carol Evans', score: 88, role: 'viewer', joined: '2024-03-22' },
    { id: '4',  name: 'Dan Fischer', score: 64, role: 'editor', joined: '2024-04-10' },
    { id: '5',  name: 'Eve Garcia',  score: 95, role: 'admin',  joined: '2024-05-30' },
    { id: '6',  name: 'Frank Hughes',score: 58, role: 'viewer', joined: '2024-06-12' },
    { id: '7',  name: 'Grace Ito',   score: 81, role: 'admin',  joined: '2024-07-04' },
    { id: '8',  name: 'Henry Jones', score: 76, role: 'editor', joined: '2024-08-19' },
    { id: '9',  name: 'Iris Kim',    score: 90, role: 'viewer', joined: '2024-09-01' },
    { id: '10', name: 'Jack Liu',    score: 67, role: 'editor', joined: '2024-10-25' },
    { id: '11', name: 'Kara Mendes', score: 84, role: 'admin',  joined: '2024-11-08' },
    { id: '12', name: 'Liam Novak',  score: 73, role: 'viewer', joined: '2024-12-14' },
  ]);

  protected readonly cols: KjColumnDef<Row>[] = [
    kjColumn<Row>({ id: 'name',   accessorKey: 'name',   header: 'Name',   kjType: 'text'   }),
    kjColumn<Row>({ id: 'score',  accessorKey: 'score',  header: 'Score',  kjType: 'number' }),
    kjColumn<Row>({
      id: 'role',
      accessorKey: 'role',
      header: 'Role',
      kjType: 'select',
      kjSelectOptions: ['admin', 'editor', 'viewer'],
    }),
    kjColumn<Row>({ id: 'joined', accessorKey: 'joined', header: 'Joined', kjType: 'date'   }),
  ];

  protected readonly getRowId = (row: Row): string => row.id;
}
