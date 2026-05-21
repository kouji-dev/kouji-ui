import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjTableToolbarComponent } from '../table-toolbar';
import { KjTablePaginationComponent } from '../table-pagination';
import { KjTableStatusBarComponent } from '../table-status-bar';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  joined: string;
}

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack',
  'Kara', 'Liam', 'Maya', 'Noah', 'Olive', 'Pat', 'Quinn', 'Ravi', 'Sage', 'Tia',
  'Uma', 'Vik', 'Wren', 'Xander', 'Yara', 'Zane',
];
const LAST_NAMES = [
  'Chen', 'Diaz', 'Evans', 'Fischer', 'Garcia', 'Hughes', 'Ito', 'Jones', 'Kim', 'Liu',
  'Mendes', 'Novak', 'Ortiz', 'Park', 'Quintero', 'Rao', 'Singh', 'Tanaka', 'Ueda', 'Vega',
];
const ROLES: User['role'][] = ['admin', 'editor', 'viewer'];

/**
 * 80 deterministic users — enough rows that pagination's next/prev land
 * un-disabled at the default `pageSize: 25` (4 pages), so the footer reads
 * as an interactive control instead of a static row count.
 */
function buildUsers(): User[] {
  const out: User[] = [];
  for (let i = 1; i <= 80; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const ln = LAST_NAMES[(i * 7) % LAST_NAMES.length]!;
    const month = String(((i - 1) % 12) + 1).padStart(2, '0');
    const day = String(((i * 3) % 28) + 1).padStart(2, '0');
    out.push({
      id: String(i),
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      role: ROLES[i % ROLES.length]!,
      joined: `2024-${month}-${day}`,
    });
  }
  return out;
}

/**
 * Full host API — bordered variant, compact density, toolbar slot, pagination,
 * status bar, and a stable row id. The canonical reference layout.
 */
@Component({
  selector: 'kj-table-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjTableComponent,
    KjTableToolbarComponent,
    KjTablePaginationComponent,
    KjTableStatusBarComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-table
      [kjData]="rows()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      kjDensity="compact"
      kjVariant="bordered"
    >
      <kj-table-toolbar kjToolbar />
      <kj-table-status-bar />
      <kj-table-pagination [kjPageSizes]="[5, 10, 25]" />
    </kj-table>
  `,
})
export class KjTableUsageExample {
  protected readonly rows = signal<User[]>(buildUsers());

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name',   accessorKey: 'name',   header: 'Name'   }),
    kjColumn<User>({ id: 'email',  accessorKey: 'email',  header: 'Email'  }),
    kjColumn<User>({ id: 'role',   accessorKey: 'role',   header: 'Role'   }),
    kjColumn<User>({ id: 'joined', accessorKey: 'joined', header: 'Joined' }),
  ];

  protected readonly getRowId = (row: User): string => row.id;
}
