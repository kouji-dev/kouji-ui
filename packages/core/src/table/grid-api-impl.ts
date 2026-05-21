import type { WritableSignal, Signal } from '@angular/core';
import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ExpandedState,
  GroupingState,
  PaginationState,
  RowData,
  RowSelectionState,
  Table,
  VisibilityState,
} from '@tanstack/angular-table';
import type {
  KjColumnApi,
  KjColumnGroupingApi,
  KjColumnOrderApi,
  KjColumnPinningApi,
  KjColumnSizingApi,
  KjColumnVisibilityApi,
  KjDensityApi,
  KjExpansionApi,
  KjFilterApi,
  KjGlobalFilterApi,
  KjGridApi,
  KjGroupingApi,
  KjPaginationApi,
  KjRowsApi,
  KjSelectionApi,
  KjSortApi,
} from './grid-api';
import { isKjFilterModel, type KjFilterModel, type KjGridFilterModel } from './filter-models';
import type { KjTableDensity, KjTableState } from './table.types';

/**
 * Build a `KjGridApi` + `KjColumnApi` pair bound to a directive instance.
 * Called once from `KjTable` and cached. Methods close over the directive's
 * private state signal and the lazy TanStack `Table` getter so every call
 * sees the live grid.
 */
export function createGridApi<TData extends RowData>(opts: {
  state: Signal<KjTableState>;
  table: () => Table<TData>;
  patch: <K extends keyof KjTableState>(
    key: K,
    updater: KjTableState[K] | ((prev: KjTableState[K]) => KjTableState[K]),
  ) => void;
  setStateInternal: WritableSignal<KjTableState>['update'];
  resetState: () => void;
  defaultState: KjTableState;
}): { gridApi: KjGridApi<TData>; columnApi: KjColumnApi<TData> } {
  const { state, table, patch, resetState, defaultState } = opts;

  const setStateMerge = (partial: Partial<KjTableState>): void => {
    opts.setStateInternal((s) => ({ ...s, ...partial }));
  };

  // ── KjColumnApi namespaces ────────────────────────────────────────────────

  const visibility: KjColumnVisibilityApi = {
    get: () => state().columnVisibility,
    set: (model) => patch('columnVisibility', model),
    isVisible: (id) => state().columnVisibility[id] !== false,
    setVisible: (id, visible) =>
      patch('columnVisibility', (prev: VisibilityState) => ({ ...prev, [id]: visible })),
    setManyVisible: (ids, visible) =>
      patch('columnVisibility', (prev: VisibilityState) => {
        const next = { ...prev };
        for (const id of ids) next[id] = visible;
        return next;
      }),
  };

  const sizing: KjColumnSizingApi = {
    get: () => state().columnSizing,
    set: (model) => patch('columnSizing', model),
    width: (id) => table().getColumn(id)?.getSize() ?? 0,
    setWidth: (id, width) =>
      patch('columnSizing', (prev: ColumnSizingState) => ({ ...prev, [id]: width })),
  };

  const pinning: KjColumnPinningApi = {
    get: () => state().columnPinning,
    set: (model) => patch('columnPinning', model),
    of: (id) => {
      const p = state().columnPinning;
      if ((p.left ?? []).includes(id)) return 'left';
      if ((p.right ?? []).includes(id)) return 'right';
      return null;
    },
    pin: (id, side) =>
      patch('columnPinning', (prev: ColumnPinningState) => ({
        left:  (prev.left  ?? []).filter((c) => c !== id).concat(side === 'left'  ? [id] : []),
        right: (prev.right ?? []).filter((c) => c !== id).concat(side === 'right' ? [id] : []),
      })),
  };

  const order: KjColumnOrderApi = {
    get: () => state().columnOrder,
    set: (o) => patch('columnOrder', o),
    move: (id, toIndex) =>
      patch('columnOrder', (prev: ColumnOrderState) => {
        const base = prev.length > 0 ? prev : table().getAllLeafColumns().map((c) => c.id);
        const without = base.filter((c) => c !== id);
        const clamped = Math.max(0, Math.min(toIndex, without.length));
        return [...without.slice(0, clamped), id, ...without.slice(clamped)];
      }),
  };

  const colGrouping: KjColumnGroupingApi = {
    is: (id) => state().grouping.includes(id),
    set: (id, grouped) =>
      patch('grouping', (prev: GroupingState) =>
        grouped
          ? prev.includes(id) ? prev : [...prev, id]
          : prev.filter((c) => c !== id),
      ),
  };

  const columnApi: KjColumnApi<TData> = {
    get: (id) => table().getColumn(id) ?? null,
    all: () => table().getAllColumns(),
    leaves: () => table().getAllLeafColumns(),
    visibleLeaves: () => table().getVisibleLeafColumns(),
    visibility,
    sizing,
    pinning,
    order,
    grouping: colGrouping,
    reset: () =>
      setStateMerge({
        columnVisibility: defaultState.columnVisibility,
        columnSizing:     defaultState.columnSizing,
        columnPinning:    defaultState.columnPinning,
        columnOrder:      defaultState.columnOrder,
        grouping:         defaultState.grouping,
      }),
  };

  // ── KjGridApi namespaces ──────────────────────────────────────────────────

  const rows: KjRowsApi<TData> = {
    all: () => (table().options.data ?? []) as readonly TData[],
    displayed: () => table().getRowModel().rows,
    count: () => (table().options.data?.length ?? 0),
    filteredCount: () => table().getFilteredRowModel().rows.length,
    displayedCount: () => table().getRowModel().rows.length,
    get: (id) => table().getRow(id, /* searchAll */ true),
  };

  const selection: KjSelectionApi<TData> = {
    get: () => state().rowSelection,
    set: (model) => patch('rowSelection', model),
    rows: () => table().getSelectedRowModel().rows,
    ids: () => Object.keys(state().rowSelection).filter((id) => state().rowSelection[id]),
    has: () => {
      const sel = state().rowSelection;
      for (const key in sel) if (sel[key]) return true;
      return false;
    },
    select: (id, selected = true) =>
      patch('rowSelection', (prev: RowSelectionState) => ({ ...prev, [id]: selected })),
    deselect: (id) =>
      patch('rowSelection', (prev: RowSelectionState) => {
        const next = { ...prev };
        delete next[id];
        return next;
      }),
    toggle: (id) =>
      patch('rowSelection', (prev: RowSelectionState) => ({ ...prev, [id]: !prev[id] })),
    all: () => {
      const next: RowSelectionState = {};
      for (const r of table().getFilteredRowModel().rows) next[r.id] = true;
      patch('rowSelection', next);
    },
    clear: () => patch('rowSelection', {}),
  };

  const sort: KjSortApi = {
    get: () => state().sorting,
    set: (s) => patch('sorting', s),
    toggle: (columnId, multi = false) => {
      const col = table().getColumn(columnId);
      if (!col) return;
      col.toggleSorting(undefined, multi);
    },
    clear: () => patch('sorting', []),
  };

  const globalFilter: KjGlobalFilterApi = {
    get: () => state().globalFilter,
    set: (value) => patch('globalFilter', value),
    clear: () => patch('globalFilter', ''),
  };

  const filter: KjFilterApi = {
    get: (id) => state().columnFilters.find((f) => f.id === id)?.value,
    set: (id, value) =>
      patch('columnFilters', (prev: ColumnFiltersState) => {
        const without = prev.filter((f) => f.id !== id);
        return value === undefined || value === null || value === ''
          ? without
          : [...without, { id, value }];
      }),
    clear: (id) =>
      patch('columnFilters', (prev: ColumnFiltersState) => prev.filter((f) => f.id !== id)),
    all: () => state().columnFilters,
    setAll: (filters) => patch('columnFilters', filters),
    global: globalFilter,
    clearAll: () => setStateMerge({ columnFilters: [], globalFilter: '' }),

    getModelFor: (id) => {
      const v = state().columnFilters.find((f) => f.id === id)?.value;
      return isKjFilterModel(v) ? v : undefined;
    },
    setModelFor: (id, model) =>
      patch('columnFilters', (prev: ColumnFiltersState) => {
        const without = prev.filter((f) => f.id !== id);
        return model == null ? without : [...without, { id, value: model }];
      }),
    getModel: (): KjGridFilterModel => {
      const out: Record<string, KjFilterModel> = {};
      for (const entry of state().columnFilters) {
        if (isKjFilterModel(entry.value)) out[entry.id] = entry.value;
      }
      return out;
    },
    setModel: (model) =>
      patch('columnFilters', () => {
        if (!model) return [];
        return Object.entries(model).map(([id, value]) => ({ id, value }));
      }),
  };

  const pagination: KjPaginationApi = {
    get: () => state().pagination,
    set: (p) => patch('pagination', p),
    pageCount: () => table().getPageCount(),
    setPageIndex: (pageIndex) =>
      patch('pagination', (prev: PaginationState) => ({ ...prev, pageIndex: Math.max(0, pageIndex) })),
    setPageSize: (pageSize) =>
      patch('pagination', () => ({ pageIndex: 0, pageSize: Math.max(1, pageSize) })),
    next: () =>
      patch('pagination', (prev: PaginationState) => ({
        ...prev,
        pageIndex: Math.min(prev.pageIndex + 1, Math.max(0, table().getPageCount() - 1)),
      })),
    previous: () =>
      patch('pagination', (prev: PaginationState) => ({
        ...prev,
        pageIndex: Math.max(0, prev.pageIndex - 1),
      })),
    first: () => patch('pagination', (prev: PaginationState) => ({ ...prev, pageIndex: 0 })),
    last: () =>
      patch('pagination', (prev: PaginationState) => ({
        ...prev,
        pageIndex: Math.max(0, table().getPageCount() - 1),
      })),
  };

  const expansion: KjExpansionApi<TData> = {
    get: () => state().expanded,
    set: (e) => patch('expanded', e),
    setRow: (id, expanded) =>
      patch('expanded', (prev: ExpandedState) => {
        if (prev === true) {
          const next: Record<string, boolean> = {};
          for (const r of table().getCoreRowModel().rows) next[r.id] = true;
          next[id] = expanded;
          return next;
        }
        return { ...prev, [id]: expanded };
      }),
    toggle: (id) =>
      patch('expanded', (prev: ExpandedState) => {
        if (prev === true) {
          const next: Record<string, boolean> = {};
          for (const r of table().getCoreRowModel().rows) next[r.id] = true;
          next[id] = false;
          return next;
        }
        return { ...prev, [id]: !prev[id] };
      }),
    expandAll: () => patch('expanded', true),
    collapseAll: () => patch('expanded', {}),
  };

  const grouping: KjGroupingApi = {
    get: () => state().grouping,
    set: (g) => patch('grouping', g),
    add: (id) =>
      patch('grouping', (prev: GroupingState) => prev.includes(id) ? prev : [...prev, id]),
    remove: (id) =>
      patch('grouping', (prev: GroupingState) =>
        id === undefined ? [] : prev.filter((c) => c !== id),
      ),
  };

  const density: KjDensityApi = {
    get: () => state().density,
    set: (d: KjTableDensity) => patch('density', d),
  };

  const gridApi: KjGridApi<TData> = {
    state,
    table,
    rows,
    selection,
    sort,
    filter,
    pagination,
    expansion,
    grouping,
    density,
    setState: setStateMerge,
    resetState,
  };

  return { gridApi, columnApi };
}
