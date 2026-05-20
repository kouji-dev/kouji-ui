import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, kjTableResource, type KjColumnDef, type KjTableState } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjTableToolbarComponent } from '../table-toolbar';
import { KjTablePaginationComponent } from '../table-pagination';
import { KjTableStatusBarComponent } from '../table-status-bar';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

const ROLES: User['role'][] = ['admin', 'editor', 'viewer'];

const ALL_USERS: User[] = Array.from({ length: 200 }, (_, i) => ({
  id: String(i + 1),
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: ROLES[i % ROLES.length]!,
}));

const INITIAL_STATE: KjTableState = {
  sorting: [],
  columnFilters: [],
  globalFilter: '',
  pagination: { pageIndex: 0, pageSize: 25 },
  rowSelection: {},
  columnSizing: {},
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  expanded: {},
  grouping: [],
  density: 'standard',
};

/**
 * Server-mode table — `kjTableResource()` wires the table's reactive state
 * (sorting, filter, pagination) into an async loader. Each interaction round-
 * trips through the 400 ms simulated endpoint and the table reflects loading
 * + total-row state via the toolbar, status bar and pagination slot.
 */
@Component({
  selector: 'kj-table-server-mode-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjTableComponent,
    KjTableToolbarComponent,
    KjTablePaginationComponent,
    KjTableStatusBarComponent,
  ],
  styles: [`
    :host { display: block; }
    /* Container-driven height: the table fills 480px and its body scrolls
       internally — toolbar / status bar / pagination stay pinned above
       and below the scrolling row area. */
    kj-table { height: 480px; }
  `],
  template: `
    <kj-table
      [kjColumns]="cols"
      [kjResource]="resource"
      [kjGetRowId]="getRowId"
      (stateChange)="onStateChange($event)"
    >
      <kj-table-toolbar kjToolbar />
      <kj-table-status-bar />
      <kj-table-pagination kjSize="xs" [kjPageSizes]="[10, 25, 50]" />
    </kj-table>
  `,
})
export class KjTableServerModeExample {
  protected readonly state = signal<KjTableState>(INITIAL_STATE);

  protected readonly resource = kjTableResource<User>({
    stateSignal: this.state,
    loader: async ({ state }) => {
      await new Promise<void>((r) => setTimeout(r, 400));
      let rows = ALL_USERS;
      const filter = state.globalFilter.toLowerCase();
      if (filter) {
        rows = rows.filter(
          (u) =>
            u.name.toLowerCase().includes(filter) ||
            u.email.toLowerCase().includes(filter) ||
            u.role.toLowerCase().includes(filter),
        );
      }
      const sort = state.sorting[0];
      if (sort) {
        const key = sort.id as keyof User;
        rows = [...rows].sort((a, b) => {
          const av = String(a[key] ?? '');
          const bv = String(b[key] ?? '');
          return sort.desc ? bv.localeCompare(av) : av.localeCompare(bv);
        });
      }
      const start = state.pagination.pageIndex * state.pagination.pageSize;
      return {
        rows: rows.slice(start, start + state.pagination.pageSize),
        rowCount: rows.length,
      };
    },
  });

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name',  accessorKey: 'name',  header: 'Name'  }),
    kjColumn<User>({ id: 'email', accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ id: 'role',  accessorKey: 'role',  header: 'Role'  }),
  ];

  protected readonly getRowId = (row: User): string => row.id;

  protected onStateChange(next: KjTableState): void {
    this.state.set(next);
  }
}
