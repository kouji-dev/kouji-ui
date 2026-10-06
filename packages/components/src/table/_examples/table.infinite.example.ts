import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent, type KjSelectAllEvent } from '../table';
import { kjTableInfiniteResource } from '../table-infinite-resource';
import { KjTableLoadingTemplate } from '../table-state-templates';
import { KjButtonComponent } from '../../button/button';
import { KjInputComponent } from '../../input/input';
import { KjSpinnerComponent } from '../../spinner/spinner';

interface Person {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly score: number;
}

const CITIES = ['Paris', 'Tokyo', 'Lagos', 'Lima', 'Oslo', 'Cairo'];

/** The "server": 25,000 people, filtered and sliced per request. */
const PEOPLE: Person[] = Array.from({ length: 25_000 }, (_, i) => ({
  id: String(i + 1),
  name: `Person ${i + 1}`,
  city: CITIES[i % CITIES.length]!,
  score: (i * 37) % 1000,
}));

/** Simulated endpoint: 300 ms latency, honours the abort signal. */
function fetchPeople(
  search: string,
  offset: number,
  limit: number,
  signal: AbortSignal,
): Promise<{ rows: Person[]; total: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const q = search.trim().toLowerCase();
      const matches = q
        ? PEOPLE.filter((p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
        : PEOPLE;
      resolve({ rows: matches.slice(offset, offset + limit), total: matches.length });
    }, 300);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/**
 * Server-side infinite scrolling. `kjTableInfiniteResource()` caches 100-row
 * pages, fetches the ones the visible range needs (one page of overscan each
 * side) and aborts loads you scroll past. The scrollbar spans the whole
 * result set; rows whose page is still loading render as skeletons. Typing
 * in the search box changes `request()`: the rows dim under the overlay
 * loader until the first page of the new result lands, then the table jumps
 * back to the top. "Refresh" is a silent reload — rows and scroll position
 * stay put. The header checkbox runs in `external` mode and means "the whole
 * result set", tracked by the example rather than per row.
 */
@Component({
  selector: 'kj-table-infinite-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    KjTableComponent,
    KjTableLoadingTemplate,
    KjButtonComponent,
    KjInputComponent,
    KjSpinnerComponent,
  ],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        font-family: var(--kj-font-sans);
        color: var(--kj-fg-default);
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: var(--kj-space-md);
        align-items: center;
        margin-bottom: var(--kj-space-md);
        font-size: var(--kj-text-sm);
        color: var(--kj-fg-muted);
      }
      .frame {
        display: flex;
        flex-direction: column;
        height: 420px;
        min-width: 0;
        border: 1px solid var(--kj-border-default);
        border-radius: var(--kj-radius-field);
        background: var(--kj-bg-surface);
        overflow: hidden;
      }
      .frame kj-table {
        flex: 1 1 auto;
        min-height: 0;
      }
    `,
  ],
  template: `
    <div class="toolbar">
      <kj-input
        placeholder="Search name or city"
        [ngModel]="search()"
        (ngModelChange)="search.set($event)"
      />
      <kj-button kjVariant="outline" kjSize="sm" (click)="people.reload({ silent: true })"
        >Refresh</kj-button
      >
      <span>
        {{ people.total() }} people
        @if (allSelected()) {
          · all selected
        }
        @if (people.isFetchingMore()) {
          · loading more…
        }
      </span>
    </div>
    <div class="frame">
      <kj-table
        [kjColumns]="cols"
        [kjGetRowId]="byId"
        [kjInfinite]="people"
        [kjEstimatedRowSize]="36"
        kjLoadingMode="overlay"
        kjSelectionMode="multi"
        kjSelectAllMode="external"
        [kjSelectAllChecked]="allSelected()"
        (selectAll)="onSelectAll($event)"
      >
        <ng-template kjLoadingTemplate>
          <kj-spinner kjAriaLabel="Loading people" />
        </ng-template>
      </kj-table>
    </div>
  `,
})
export class KjTableInfiniteExample {
  protected readonly search = signal('');
  protected readonly allSelected = signal(false);

  protected readonly people = kjTableInfiniteResource<Person, { search: string }>({
    request: () => ({ search: this.search() }),
    pageSize: 100,
    loader: ({ request, offset, limit, abortSignal }) =>
      fetchPeople(request.search, offset, limit, abortSignal),
  });

  protected readonly cols = [
    kjColumn<Person>({ accessorKey: 'id', header: 'ID' }),
    kjColumn<Person>({ accessorKey: 'name', header: 'Name' }),
    kjColumn<Person>({ accessorKey: 'city', header: 'City' }),
    kjColumn<Person>({ accessorKey: 'score', header: 'Score' }),
  ];

  protected readonly byId = (row: Person): string => row.id;

  protected onSelectAll(event: KjSelectAllEvent): void {
    this.allSelected.set(event.checked);
  }
}
