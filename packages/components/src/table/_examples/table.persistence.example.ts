import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { inMemoryAdapter, kjColumn, type KjColumnDef, type KjStorageAdapter } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjTableToolbarComponent } from '../table-toolbar';
import { KjButtonComponent } from '../../button/button';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

/**
 * Persistence — pass a stable `kjStorageKey` plus an adapter. The table writes
 * its state (sorting, filters, pagination, column visibility, density…) to the
 * adapter on every change and re-hydrates on mount. Click "Remount" to swap
 * the table via `*ngIf` and watch state restore from the in-memory adapter.
 * Swap `inMemoryAdapter()` for `localStorageAdapter()` to survive real reloads.
 */
@Component({
  selector: 'kj-table-persistence-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent, KjTableToolbarComponent, KjButtonComponent],
  styles: [`
    :host { display: block; }
    .kj-actions { display: flex; gap: 0.5rem; margin-block-end: 0.75rem; }
  `],
  template: `
    <div class="kj-actions">
      <kj-button kjVariant="outline" kjSize="sm" (click)="remount()">
        Remount table
      </kj-button>
      <span aria-live="polite">{{ statusLabel() }}</span>
    </div>

    @if (mounted()) {
      <kj-table
        [kjData]="rows()"
        [kjColumns]="cols"
        [kjGetRowId]="getRowId"
        [kjStorageKey]="'kj.docs.persistence-demo'"
        [kjStorageAdapter]="adapter"
      >
        <kj-table-toolbar />
      </kj-table>
    }
  `,
})
export class KjTablePersistenceExample {
  protected readonly mounted = signal(true);
  protected readonly statusLabel = signal('Sort / filter / change density, then click Remount.');

  /**
   * In-memory adapter shared across remounts. Replace with
   * `localStorageAdapter()` to persist across page reloads.
   */
  protected readonly adapter: KjStorageAdapter = inMemoryAdapter();

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

  protected remount(): void {
    this.mounted.set(false);
    this.statusLabel.set('Unmounted — state lives in the adapter.');
    queueMicrotask(() => {
      this.mounted.set(true);
      this.statusLabel.set('Remounted — state restored from the adapter.');
    });
  }
}
