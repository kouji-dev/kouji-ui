import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { kjColumn, kjTableResource, type KjColumnDef, type KjTableState } from '@kouji-ui/core';
import { KjTableComponent } from '../table';
import { KjTableEmptyTemplate, KjTableErrorTemplate } from '../table-state-templates';
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
 * Empty and error states — two tables side by side, both height-constrained so
 * the state pane centers in the space left below the header.
 *
 * Left: empty data with a custom `kjEmptyTemplate` that prompts the user to add
 *   a row.
 * Right: a resource-backed table whose loader rejects, surfacing a custom
 *   `kjErrorTemplate` with a retry button.
 *
 * Both use `<ng-template>` slots, so the markup is instantiated only while that
 * state is on screen. The older `[kjEmpty]` / `[kjError]` attribute slots remain
 * supported for static markup.
 */
@Component({
  selector: 'kj-table-empty-and-error-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjTableComponent,
    KjButtonComponent,
    KjTableEmptyTemplate,
    KjTableErrorTemplate,
  ],
  styles: [`
    :host { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
    @media (min-width: 60rem) { :host { grid-template-columns: 1fr 1fr; } }
    /* Constrained height — shows the pane centering in the residual space. */
    kj-table { height: 16rem; }
    .kj-empty, .kj-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      text-align: center;
    }
    .kj-empty p, .kj-error p { margin: 0; }
  `],
  template: `
    <section>
      <h3>Empty</h3>
      <kj-table [kjData]="emptyRows" [kjColumns]="cols">
        <ng-template kjEmptyTemplate>
          <div class="kj-empty">
            <p>No users found.</p>
            <kj-button kjVariant="default" kjSize="sm" (click)="addUser()">
              Add user
            </kj-button>
          </div>
        </ng-template>
      </kj-table>
      @if (added()) {
        <p aria-live="polite">Pretend we just opened an "add user" dialog.</p>
      }
    </section>

    <section>
      <h3>Error</h3>
      <kj-table [kjColumns]="cols" [kjResource]="failingResource">
        <ng-template kjErrorTemplate>
          <div class="kj-error">
            <p>Failed to load.</p>
            <kj-button kjVariant="outline" kjSize="sm" (click)="retry()">
              Try again
            </kj-button>
          </div>
        </ng-template>
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
