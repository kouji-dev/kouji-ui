import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent, type KjRowClickEvent } from '../table';

interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly lastLogin: string;
  readonly permissions: readonly string[];
}

const ROWS: User[] = [
  {
    id: '1',
    name: 'Alice',
    email: 'alice@example.com',
    lastLogin: '2026-05-16 09:14',
    permissions: ['read', 'write', 'admin'],
  },
  {
    id: '2',
    name: 'Bob',
    email: 'bob@example.com',
    lastLogin: '2026-05-15 17:42',
    permissions: ['read'],
  },
  {
    id: '3',
    name: 'Carol',
    email: 'carol@example.com',
    lastLogin: '2026-05-17 08:01',
    permissions: ['read', 'write'],
  },
];

/**
 * Master-detail: clicking a row toggles a detail panel rendered via the
 * `<ng-template #kjRowExpansion>` slot. The implicit context is the row's
 * original data, exposed here through the `let-row` micro-syntax.
 *
 */
@Component({
  selector: 'kj-table-master-detail-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent],
  styles: [`
    :host { display: block; }
    .kj-detail {
      padding: 0.75rem 1rem;
      background: var(--kj-base-color-surface-subtle, #f6f8fa);
      font-size: 0.875rem;
    }
    .kj-detail dl {
      margin: 0;
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 0.75rem;
    }
    .kj-detail dt { font-weight: 600; }
    .kj-detail dd { margin: 0; }
  `],
  template: `
    <kj-table
      [kjData]="data()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      (rowClick)="onRowClick($any($event))"
    >
      <ng-template #kjRowExpansion let-row>
        <div class="kj-detail">
          <dl>
            <dt>Last login</dt><dd>{{ row.lastLogin }}</dd>
            <dt>Permissions</dt><dd>{{ row.permissions.join(', ') }}</dd>
          </dl>
        </div>
      </ng-template>
    </kj-table>
  `,
})
export class KjTableMasterDetailExample {
  protected readonly data = signal<User[]>(ROWS);
  protected readonly getRowId = (row: User): string => row.id;

  private readonly tableRef = viewChild.required(KjTableComponent);

  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name',  header: 'Name'  }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email' }),
  ];

  protected onRowClick(e: KjRowClickEvent<User>): void {
    const row = this.tableRef().tableRef().table().getRow(e.row.id);
    row?.toggleExpanded();
  }
}
