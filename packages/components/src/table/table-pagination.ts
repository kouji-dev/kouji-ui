import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { KJ_TABLE, KjTable } from '@kouji-ui/core';
import {
  KjPaginationComponent,
  KjPaginationFirstComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationLastComponent,
} from '../pagination';
import { KjSelectComponent, KjOptionComponent } from '../select';

/**
 * Pagination footer for `<kj-table>`. Reads the active TanStack table
 * instance via `KJ_TABLE` and writes through its mutation API
 * (`setPageIndex`, `setPageSize`). Composes `<kj-pagination>` for the
 * navigation row (First / Previous / Next / Last) and `<kj-select>` for the
 * page-size control, plus a "Showing X–Y of Z" `aria-live` summary.
 *
 * Index translation: `KjPagination` is 1-indexed (page 1..N) whereas
 * TanStack's `pageIndex` is 0-indexed. The component translates at the
 * boundary — `kjPage` bound to `pageIndex() + 1`, and `(kjPageChange)`
 * writes `next - 1` back to `setPageIndex`. `kjTotalPages` is clamped to a
 * minimum of `1` to satisfy the pagination directive's clamp invariant when
 * the dataset is empty (zero rows still yields one empty page).
 *
 * Project into a `<kj-table>` (or any element hosting the `KjTable`
 * directive) so the component can resolve the shared table state.
 *
 * @example
 * ```html
 * <kj-table [kjData]="rows()" [kjColumns]="cols">
 *   <kj-table-pagination [kjPageSizes]="[10, 25, 50]" />
 * </kj-table>
 * ```
 *
 * @doc-category Components/Data
 * @doc
 * @doc-name table-pagination
 * @doc-description Page-size selector, First/Prev/Next/Last nav, and "Showing N–M of total" summary bound to the parent table.
 */
@Component({
  selector: 'kj-table-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjPaginationComponent,
    KjPaginationFirstComponent,
    KjPaginationPreviousComponent,
    KjPaginationNextComponent,
    KjPaginationLastComponent,
    KjSelectComponent,
    KjOptionComponent,
  ],
  host: {
    class: 'kj-table-pagination',
    '[attr.data-size]': "kjSize() === 'md' ? null : kjSize()",
  },
  styles: [`
    /* Three-column footer:
       [ page-size ]   [ Showing N–M of T ]   [ « ‹ — › » ]
       The nav row uses justify-content: space-between so the prev/next
       cluster doesn't bunch against the boundary buttons — the row reads
       as separate jump-to-edge and step-by-one controls. */
    .kj-table-pagination {
      display: flex;
      align-items: center;
      gap: var(--kj-space-md);
      padding: var(--kj-space-sm) var(--kj-space-md);
      border-top: 1px solid var(--kj-border-default);
      background: var(--kj-bg-surface);
      font-size: var(--kj-text-sm);
      color: var(--kj-fg-default);
    }
    .kj-table-pagination__page-size {
      display: inline-flex;
      align-items: center;
      gap: var(--kj-space-xs);
      color: var(--kj-fg-muted);
      white-space: nowrap;
    }
    .kj-table-pagination__summary {
      flex: 1 1 auto;
      text-align: center;
      color: var(--kj-fg-muted);
      white-space: nowrap;
    }
    /* The nav row carries the four boundary/step buttons. space-between
       splits them into two visual clusters — «‹ on one side, ›» on the
       other — when the row is given a fixed width. */
    .kj-table-pagination__nav {
      display: inline-flex;
      align-items: center;
      gap: var(--kj-space-xs);
      justify-content: space-between;
      min-width: 8rem;
    }
  `],
  template: `
    <div class="kj-table-pagination__page-size">
      <span class="kj-table-pagination__page-size-label">Rows per page</span>
      <kj-select
        class="kj-table-pagination__select"
        [kjSize]="kjSize()"
        [value]="pageSize()"
        (valueChange)="onPageSizeChange($event)"
      >
        @for (size of kjPageSizes(); track size) {
          <kj-option [value]="size">{{ size }}</kj-option>
        }
      </kj-select>
    </div>

    @if (kjShowSummary()) {
      <span class="kj-table-pagination__summary" aria-live="polite">
        Showing {{ summary().start }}–{{ summary().end }} of {{ summary().total }}
      </span>
    }

    <kj-pagination
      class="kj-table-pagination__nav"
      [kjSize]="kjSize()"
      [kjPage]="page1Indexed()"
      [kjTotalPages]="totalPages()"
      (kjPageChange)="onPageChange($event)"
    >
      <kj-pagination-first [kjSize]="kjSize()">«</kj-pagination-first>
      <kj-pagination-previous [kjSize]="kjSize()">‹</kj-pagination-previous>
      <kj-pagination-next [kjSize]="kjSize()">›</kj-pagination-next>
      <kj-pagination-last [kjSize]="kjSize()">»</kj-pagination-last>
    </kj-pagination>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class KjTablePaginationComponent {
  /** Available page sizes for the selector. */
  readonly kjPageSizes = input<readonly number[]>([10, 25, 50, 100]);
  /** Show the "Showing N–M of total" summary. Default `true`. */
  readonly kjShowSummary = input<boolean>(true);
  /** Size tier — matches the rest of the design system. `xs` for dense
   *  footers, `lg` for touch-first. Forwarded to both the page-size select
   *  and the nav buttons so the row stays visually consistent. */
  readonly kjSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  protected readonly tableCtx = inject(KJ_TABLE) as KjTable<unknown>;

  protected readonly pageSize = computed(() => this.tableCtx.state.pagination().pageSize);
  protected readonly pageIndex = computed(() => this.tableCtx.state.pagination().pageIndex);

  /** TanStack `pageIndex` (0-indexed) translated to `KjPagination`'s 1-indexed model. */
  protected readonly page1Indexed = computed(() => this.pageIndex() + 1);

  /**
   * Total pages reported by TanStack, clamped to a minimum of 1. The
   * pagination directive treats `kjTotalPages <= 0` as "no pages" and locks
   * `kjPage` to 1 — passing 1 here avoids the clamp on empty datasets.
   */
  protected readonly totalPages = computed(() =>
    Math.max(1, this.tableCtx.table().getPageCount()),
  );

  protected readonly summary = computed(() => {
    const t = this.tableCtx.table();
    const total = t.getRowCount();
    const size = this.pageSize();
    const idx = this.pageIndex();
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const start = idx * size + 1;
    const end = Math.min(start + size - 1, total);
    return { start, end, total };
  });

  /** Receive 1-indexed page from `KjPagination` and translate to 0-indexed `setPageIndex`. */
  protected onPageChange(next1Indexed: number): void {
    const next = next1Indexed - 1;
    if (next === this.pageIndex()) return;
    this.tableCtx.table().setPageIndex(next);
  }

  protected onPageSizeChange(value: unknown): void {
    const next = Number(value);
    if (!Number.isFinite(next) || next === this.pageSize()) return;
    this.tableCtx.table().setPageSize(next);
  }
}
