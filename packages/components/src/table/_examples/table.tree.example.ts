import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent, type KjExpandedChangeEvent, type KjRowClickEvent } from '../table';
import { kjTableInfiniteResource } from '../table-infinite-resource';
import { KjTableLoadingTemplate } from '../table-state-templates';
import { KjButtonComponent } from '../../button/button';
import { KjSpinnerComponent } from '../../spinner/spinner';

interface Invoice {
  readonly id: string;
  readonly label: string;
  readonly store: string;
  readonly amount: number;
  /** Credit notes and corrections attached to the invoice. */
  readonly lines?: readonly Invoice[];
}

const STORES = ['Lyon', 'Nantes', 'Lille', 'Nice', 'Brest'];

/** Invoice `i`: every third one carries one or two credit notes. */
function invoice(i: number): Invoice {
  const id = `F-${String(i + 1).padStart(5, '0')}`;
  const amount = 1000 + ((i * 137) % 9000);
  const lines: Invoice[] =
    i % 3 === 0
      ? Array.from({ length: 1 + (i % 2) }, (_, k) => ({
          id: `${id}-A${k + 1}`,
          label: `Credit note ${k + 1}`,
          store: STORES[i % STORES.length]!,
          amount: -Math.round(amount / (4 + k)),
        }))
      : [];
  return {
    id,
    label: `Invoice ${id}`,
    store: STORES[i % STORES.length]!,
    amount,
    lines: lines.length ? lines : undefined,
  };
}

/** The "server": 5,000 invoices, paged by top-level row. */
function fetchInvoices(
  offset: number,
  limit: number,
  signal: AbortSignal,
): Promise<{ rows: Invoice[]; total: number }> {
  const total = 5000;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const rows: Invoice[] = [];
      for (let i = offset; i < Math.min(offset + limit, total); i++) rows.push(invoice(i));
      resolve({ rows, total });
    }, 300);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/**
 * Tree rows. `[kjGetSubRows]` returns a row's children; they render as real
 * rows with the same columns, indented under a chevron toggle that shows
 * their count (click it, press Enter on the cell, or ArrowRight / ArrowLeft).
 * `kjDefaultExpanded` opens every parent; `expandAll()` / `collapseAll()`
 * act on rows loaded later too. Selection stays per row (bind
 * `kjSelectSubRows` to cascade), and with a checkbox column a row click only
 * fires `(rowClick)` — free for navigation.
 *
 * The second table pairs it with server-side infinite scrolling: the loader
 * pages top-level invoices (offset / limit / total count them), expanded
 * credit notes are inserted into the virtual list without moving the scroll
 * position, and a silent "Refresh" keeps what is open.
 */
@Component({
  selector: 'kj-table-tree-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTableComponent, KjTableLoadingTemplate, KjButtonComponent, KjSpinnerComponent],
  styles: [
    `
      :host {
        display: grid;
        gap: var(--kj-space-lg);
        width: 100%;
        font-family: var(--kj-font-sans);
        color: var(--kj-fg-default);
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: var(--kj-space-sm);
        align-items: center;
        margin-bottom: var(--kj-space-sm);
        font-size: var(--kj-text-sm);
        color: var(--kj-fg-muted);
      }
      .frame {
        display: flex;
        flex-direction: column;
        height: 360px;
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
    <section>
      <div class="toolbar">
        <kj-button kjVariant="outline" kjSize="sm" (click)="clientTable().expandAll()"
          >Expand all</kj-button
        >
        <kj-button kjVariant="outline" kjSize="sm" (click)="clientTable().collapseAll()"
          >Collapse all</kj-button
        >
        <span>{{ lastEvent() }}</span>
      </div>
      <kj-table
        #client
        [kjData]="invoices"
        [kjColumns]="cols"
        [kjGetRowId]="byId"
        [kjGetSubRows]="lines"
        kjDefaultExpanded
        kjSelectionMode="multi"
        kjPageSize="all"
        (expandedChange)="onExpanded($event)"
        (rowClick)="onRowClick($event)"
      />
    </section>

    <section>
      <div class="toolbar">
        <kj-button kjVariant="outline" kjSize="sm" (click)="server.reload({ silent: true })"
          >Refresh</kj-button
        >
        <span>
          {{ server.total() }} invoices
          @if (server.isFetchingMore()) {
            · loading more…
          }
        </span>
      </div>
      <div class="frame">
        <kj-table
          [kjColumns]="cols"
          [kjGetRowId]="byId"
          [kjGetSubRows]="lines"
          [kjInfinite]="server"
          [kjEstimatedRowSize]="36"
          kjLoadingMode="overlay"
        >
          <ng-template kjLoadingTemplate>
            <kj-spinner kjAriaLabel="Loading invoices" />
          </ng-template>
        </kj-table>
      </div>
    </section>
  `,
})
export class KjTableTreeExample {
  protected readonly clientTable = viewChild.required<KjTableComponent<Invoice>>('client');
  protected readonly lastEvent = signal('Click a row to open it');

  protected readonly invoices: Invoice[] = Array.from({ length: 12 }, (_, i) => invoice(i));

  protected readonly server = kjTableInfiniteResource<Invoice, null>({
    request: () => null,
    pageSize: 100,
    loader: ({ offset, limit, abortSignal }) => fetchInvoices(offset, limit, abortSignal),
  });

  protected readonly cols = [
    kjColumn<Invoice>({ accessorKey: 'label', header: 'Document' }),
    kjColumn<Invoice>({ accessorKey: 'store', header: 'Store' }),
    kjColumn<Invoice>({ accessorKey: 'amount', header: 'Amount (€)' }),
  ];

  protected readonly byId = (row: Invoice): string => row.id;
  protected readonly lines = (row: Invoice): readonly Invoice[] | undefined => row.lines;

  protected onExpanded(event: KjExpandedChangeEvent<Invoice>): void {
    const what = event.row ? event.row.label : 'Every invoice';
    this.lastEvent.set(`${what} ${event.expanded ? 'expanded' : 'collapsed'}`);
  }

  protected onRowClick(event: KjRowClickEvent<Invoice>): void {
    this.lastEvent.set(`Opened ${event.row.label}`);
  }
}
