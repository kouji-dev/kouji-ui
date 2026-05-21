import {
  Directive,
  EnvironmentInjector,
  Injector,
  TemplateRef,
  Type,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal,
  type ComponentRef,
  type EmbeddedViewRef,
  type Signal,
} from '@angular/core';
import type { Column, RowData } from '@tanstack/angular-table';
import { KJ_TABLE, KjTable } from './table';
import { provideKjFilterParams, type KjFilterParams, type KjFilterRenderer } from './filter-params';

/**
 * Mounts a user-supplied filter UI (component class or `TemplateRef`) and
 * wires it to a single `Column`. The mounted view receives a stable
 * `KjFilterParams` object via:
 *
 * - the component's `params` input (if it declares one), and
 * - the `KJ_FILTER_PARAMS` DI token (for components that prefer DI), and
 * - `let-params` on a template.
 *
 * The outlet itself owns the column's filter signal — it reads
 * `column.getFilterValue()` through the table's state signal so any external
 * change (URL state, persisted state, programmatic `gridApi.setColumnFilter`)
 * flows back into the UI.
 *
 * @example
 * ```html
 * <th kj-table-filter-outlet [kjColumn]="col" [kjFilter]="MyFilter" />
 * ```
 */
@Directive({
  selector: '[kj-table-filter-outlet],[kjTableFilterOutlet]',
  standalone: true,
})
export class KjTableFilterOutlet<TData extends RowData = unknown, TValue = unknown> {
  /** The TanStack column this outlet's filter operates on. */
  kjColumn = input.required<Column<TData, TValue>>();

  /** The filter renderer — a component class or a `TemplateRef`. */
  kjFilter = input.required<KjFilterRenderer<TData, TValue>>();

  private readonly tableDir = inject<KjTable<TData>>(KJ_TABLE as never);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly parentInjector = inject(Injector);

  /** Reactive view of the column's current filter value. */
  private readonly modelSignal: Signal<TValue | null> = computed(() => {
    // Subscribe to the underlying state slice so this re-runs whenever the
    // filter changes — `getFilterValue()` itself isn't a signal.
    this.tableDir.state.columnFilters();
    const v = this.kjColumn().getFilterValue();
    return (v ?? null) as TValue | null;
  });

  private mounted = signal<
    | { kind: 'component'; ref: ComponentRef<{ params?: KjFilterParams<TData, TValue> }> }
    | { kind: 'template';  ref: EmbeddedViewRef<KjFilterParams<TData, TValue>> }
    | null
  >(null);

  constructor() {
    // Mount / re-mount whenever the renderer or column changes.
    effect(() => {
      const renderer = this.kjFilter();
      const column   = this.kjColumn();
      this.destroyMount();
      this.viewContainer.clear();

      const params: KjFilterParams<TData, TValue> = {
        column,
        api: this.tableDir.gridApi,
        columnApi: this.tableDir.columnApi,
        model: this.modelSignal,
        setModel: (value) => {
          column.setFilterValue(
            value === '' || value === null || value === undefined ? undefined : value,
          );
        },
        isActive: () => column.getIsFiltered(),
        clear: () => column.setFilterValue(undefined),
      };

      if (renderer instanceof TemplateRef) {
        const view = this.viewContainer.createEmbeddedView(renderer, params);
        this.mounted.set({ kind: 'template', ref: view });
      } else {
        const childInjector = Injector.create({
          providers: [provideKjFilterParams(params)],
          parent: this.parentInjector,
        });
        const ref = this.viewContainer.createComponent(renderer as Type<{ params?: KjFilterParams<TData, TValue> }>, {
          environmentInjector: this.envInjector,
          injector: childInjector,
        });
        // Set the input only when the component declares it — Angular
        // throws if the input doesn't exist, so we guard with try/catch.
        try { ref.setInput('params', params); } catch { /* component opted out of the input */ }
        this.mounted.set({ kind: 'component', ref });
      }
    });
  }

  private destroyMount(): void {
    const m = this.mounted();
    if (!m) return;
    if (m.kind === 'component') m.ref.destroy();
    else m.ref.destroy();
    this.mounted.set(null);
  }
}
