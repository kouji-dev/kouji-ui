import {
  DestroyRef,
  Directive,
  EnvironmentInjector,
  Injector,
  Type,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  type ComponentRef,
} from '@angular/core';
import type { Column, Table } from '@tanstack/angular-table';
import {
  KJ_TABLE,
  KjTable,
  provideKjFilterParams,
  type KjFilterParams,
} from '@kouji-ui/core';
import { KJ_FILTER_CONTEXT, type KjFilterContext } from './table-filters/text-filter';

/**
 * Cell-row outlet that mounts a built-in or user-supplied filter UI for one
 * column. Uses its own `ViewContainerRef` for mount + destroy, so when the
 * host `@if` removes the directive Angular destroys the filter automatically
 * — no DOM querying, no manual lifecycle bookkeeping.
 *
 * The mounted component receives:
 * - **`KJ_FILTER_CONTEXT`** (legacy) — for the four built-in filters.
 * - **`KJ_FILTER_PARAMS`** (modern) — used via {@link injectKjFilterParams}
 *   from any user-supplied filter. Custom filters should prefer this token
 *   over an `@Input() params` field — `setInput` / `inputBinding` cannot be
 *   forwarded blindly here because we don't know whether the input is
 *   declared, and Angular's `inputBinding` errors when the target component
 *   has no matching input.
 *
 * Column-level options (e.g. `selectOptions`) are sourced directly from
 * `params.column.columnDef.meta.kj` by the filter itself, not piped through
 * this outlet — keeping the outlet free of filter-type branching.
 *
 * ```html
 * <ng-container
 *   kjFilterCell
 *   [kjColumn]="h.column"
 *   [kjFilter]="filterRendererFor(h.column)"
 * />
 * ```
 */
@Directive({
  selector: '[kjFilterCell]',
  standalone: true,
})
export class KjFilterCellOutlet<TData = unknown> {
  /** Column this filter operates on. */
  readonly kjColumn = input.required<Column<TData, unknown>>();

  /** Component class to mount. `null` mounts nothing. */
  readonly kjFilter = input<Type<unknown> | null>(null);

  private readonly vcr = inject(ViewContainerRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly parentInjector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tableDir = inject<KjTable<TData>>(KJ_TABLE as never);

  private ref: ComponentRef<unknown> | null = null;

  // Cache the params used to mount the current ref. The effect compares
  // these on each run and skips re-mounting when nothing meaningful changed
  // — without this guard, even an identity-stable input that happens to be
  // re-emitted (e.g. TanStack rebuilding header groups on every CD) would
  // tear the filter down and recreate it, which broke the kj-select overlay
  // because the kj-select got destroyed mid-open.
  private mountedFor: { filter: Type<unknown> | null; column: Column<TData, unknown> | null } = { filter: null, column: null };

  constructor() {
    effect(() => {
      const filter = this.kjFilter();
      const column = this.kjColumn();
      // Skip the re-mount when nothing meaningful changed. Without this
      // guard, the parent template re-evaluates inputs every CD pass (the
      // TanStack `Column` reference can be re-created during table init),
      // so the effect would tear the filter down and rebuild it 8–12 times
      // — destroying the kj-select mid-open and making the dropdown look
      // broken.
      if (this.ref && this.mountedFor.filter === filter && this.mountedFor.column === column) {
        return;
      }
      this.tearDown();
      if (!filter) return;

      const tbl: Table<TData> = this.tableDir.table();
      const ctx: KjFilterContext<TData> = { column, table: tbl };
      const modelSig = computed(() => {
        // Subscribe to the table's filter state slice so the param signal
        // updates whenever any column filter changes.
        this.tableDir.state.columnFilters();
        return (column.getFilterValue() ?? null) as unknown;
      });
      const params: KjFilterParams<TData, unknown> = {
        column,
        api: this.tableDir.gridApi,
        columnApi: this.tableDir.columnApi,
        model: modelSig,
        setModel: (v) =>
          column.setFilterValue(
            v === '' || v === null || v === undefined ? undefined : v,
          ),
        isActive: () => column.getIsFiltered(),
        clear: () => column.setFilterValue(undefined),
      };

      const childInjector = Injector.create({
        providers: [
          { provide: KJ_FILTER_CONTEXT, useValue: ctx },
          provideKjFilterParams(params),
        ],
        parent: this.parentInjector,
      });
      this.ref = this.vcr.createComponent(filter, {
        environmentInjector: this.envInjector,
        injector: childInjector,
      });
      this.mountedFor = { filter, column };
    });

    this.destroyRef.onDestroy(() => this.tearDown());
  }

  private tearDown(): void {
    this.ref?.destroy();
    this.ref = null;
    this.vcr.clear();
    this.mountedFor = { filter: null, column: null };
  }
}
