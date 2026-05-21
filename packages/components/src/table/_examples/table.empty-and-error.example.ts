import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, kjTableResource, type KjColumnDef, type KjTableState } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjButtonComponent } from '../../button/button';

interface User {
  id: string;
  name: string;
  email: string;
}

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
 * Empty and error states — two tables side by side.
 *
 * Left: empty data with a custom `kjEmpty` slot that prompts the user to add
 *   a row.
 * Right: a resource-backed table whose loader rejects, surfacing a custom
 *   `kjError` slot with a retry button.
 */
@Component({
  selector: 'kj-table-empty-and-error-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent, KjButtonComponent],
  styles: [`
    :host { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
    @media (min-width: 60rem) { :host { grid-template-columns: 1fr 1fr; } }
    .kj-empty, .kj-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      text-align: center;
    }
    .kj-empty p, .kj-error p { margin: 0; }
  `],
  template: `
    <section>
      <h3>Empty</h3>
      <kj-table [kjData]="emptyRows" [kjColumns]="cols">
        <div kjEmpty class="kj-empty">
          <p>No users found.</p>
          <kj-button kjVariant="default" kjSize="sm" (click)="addUser()">
            Add user
          </kj-button>
        </div>
      </kj-table>
      @if (added()) {
        <p aria-live="polite">Pretend we just opened an "add user" dialog.</p>
      }
    </section>

    <section>
      <h3>Error</h3>
      <kj-table [kjColumns]="cols" [kjResource]="failingResource">
        <div kjError class="kj-error" role="alert">
          <p>Failed to load.</p>
          <kj-button kjVariant="outline" kjSize="sm" (click)="retry()">
            Try again
          </kj-button>
        </div>
      </kj-table>
      @if (retried()) {
        <p aria-live="polite">Retry clicked — wired in real apps via reload().</p>
      }
    </section>
  `,
})
export class KjTableEmptyAndErrorExample {
  protected readonly emptyRows: User[] = [];
  protected readonly added = signal(false);
  protected readonly retried = signal(false);
  protected readonly state = signal<KjTableState>(INITIAL_STATE);

  protected readonly cols: KjColumnDef<User>[] = [
    kjColumn<User>({ id: 'name', accessorKey: 'name', header: 'Name' }),
    kjColumn<User>({ id: 'email', accessorKey: 'email', header: 'Email' }),
  ];

  protected readonly failingResource = kjTableResource<User>({
    stateSignal: this.state,
    loader: async () => {
      await new Promise<void>((r) => setTimeout(r, 250));
      throw new Error('Network error: could not load users.');
    },
  });

  protected addUser(): void {
    this.added.set(true);
  }

  protected retry(): void {
    this.retried.set(true);
    this.failingResource.reload();
  }
}
