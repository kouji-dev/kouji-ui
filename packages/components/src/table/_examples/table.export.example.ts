import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import {
  KjTableToolbarComponent,
  type KjTableExportFormat,
} from '../table-toolbar';
import { copyToClipboard, downloadString, exportCsv, exportJson } from '../table-export';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

const COLUMN_IDS = ['name', 'email', 'role'] as const;

/**
 * Export — the toolbar's export menu emits `(export)` with `'csv' | 'json' |
 * 'clipboard'`. Wire it to the table rows: CSV / JSON downloads via
 * `downloadString`, clipboard copy via `copyToClipboard`.
 */
@Component({
  selector: 'kj-table-export-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent, KjTableToolbarComponent],
  styles: [`
    :host { display: block; }
    .kj-export-status { display: block; margin-block-start: 0.5rem; font-size: 0.875rem; }
  `],
  template: `
    <kj-table [kjData]="rows()" [kjColumns]="cols" [kjGetRowId]="getRowId">
      <kj-table-toolbar (export)="onExport($event)" />
    </kj-table>
    <span class="kj-export-status" aria-live="polite">{{ status() }}</span>
  `,
})
export class KjTableExportExample {
  protected readonly status = signal('Pick a format from the Export menu.');

  protected readonly rows = signal<User[]>([
    { id: '1', name: 'Alice Chen', email: 'alice@example.com', role: 'admin' },
    { id: '2', name: 'Bob Diaz', email: 'bob@example.com', role: 'editor' },
    { id: '3', name: 'Carol Evans', email: 'carol@example.com', role: 'viewer' },
    { id: '4', name: 'Dan Fischer', email: 'dan@example.com', role: 'editor' },
    { id: '5', name: 'Eve Garcia', email: 'eve@example.com', role: 'admin' },
  ]);

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name', accessorKey: 'name', header: 'Name' }),
    kjColumn<User>({ id: 'email', accessorKey: 'email', header: 'Email' }),
    kjColumn<User>({ id: 'role', accessorKey: 'role', header: 'Role' }),
  ];

  protected readonly getRowId = (row: User): string => row.id;

  protected async onExport(format: KjTableExportFormat): Promise<void> {
    const rows = this.rows();
    switch (format) {
      case 'csv': {
        const csv = exportCsv({ rows, columns: [...COLUMN_IDS] });
        downloadString('users.csv', csv, 'text/csv;charset=utf-8');
        this.status.set('Downloaded users.csv');
        return;
      }
      case 'json': {
        const json = exportJson({ rows });
        downloadString('users.json', json, 'application/json');
        this.status.set('Downloaded users.json');
        return;
      }
      case 'clipboard': {
        const csv = exportCsv({ rows, columns: [...COLUMN_IDS] });
        await copyToClipboard(csv);
        this.status.set('Copied CSV to clipboard');
        return;
      }
    }
  }
}
