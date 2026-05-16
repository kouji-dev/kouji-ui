import type { ColumnDef, RowData, Table, SortingState, ColumnFiltersState, PaginationState, RowSelectionState, ColumnSizingState, VisibilityState, ColumnOrderState, ColumnPinningState, ExpandedState, GroupingState } from '@tanstack/angular-table';
import type { TemplateRef, Type } from '@angular/core';

/** Built-in column types. Drives filter widget, editor widget, formatter, alignment. */
export type KjColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select';

/** Pin slot for a column. */
export type KjColumnPin = 'left' | 'right' | null;

/** Built-in aggregation kinds; pass a function for custom. */
export type KjAggregationKind = 'sum' | 'avg' | 'min' | 'max' | 'count';
export type KjAggregationFn<T> = (rows: readonly T[]) => unknown;
export type KjAggregation<T> = KjAggregationKind | KjAggregationFn<T>;

/** Editor / filter UI override: a component class OR a template ref. */
export type KjEditorRef<TData = unknown, TValue = unknown> =
  | Type<unknown>
  | TemplateRef<{ row: TData; value: TValue; commit: (v: TValue) => void; cancel: () => void }>;

export type KjFilterUiRef<TData = unknown> =
  | Type<unknown>
  | TemplateRef<{ column: unknown; table: Table<TData> }>;

/** kj-specific meta stored on TanStack ColumnDef.meta.kj. */
export interface KjColumnMeta<TData extends RowData = RowData> {
  type?: KjColumnType;
  editable?: boolean;
  filterable?: boolean;
  pin?: KjColumnPin;
  group?: boolean;
  agg?: KjAggregation<TData>;
  editor?: KjEditorRef<TData>;
  filterUi?: KjFilterUiRef<TData>;
  selectOptions?: ReadonlyArray<string | { value: unknown; label: string }>;
  exportable?: boolean;
  persist?: boolean;
}

/** kj column definition — TanStack ColumnDef extended with kj* top-level knobs. */
export type KjColumnDef<TData extends RowData = RowData> =
  ColumnDef<TData> & {
    kjType?: KjColumnType;
    kjEditable?: boolean;
    kjFilterable?: boolean;
    kjPin?: KjColumnPin;
    kjGroup?: boolean;
    kjAgg?: KjAggregation<TData>;
    kjEditor?: KjEditorRef<TData>;
    kjFilterUi?: KjFilterUiRef<TData>;
    kjSelectOptions?: ReadonlyArray<string | { value: unknown; label: string }>;
    kjExportable?: boolean;
    kjPersist?: boolean;
  };

/** Complete table state — exposed via signals and emitted via (stateChange). */
export interface KjTableState {
  readonly sorting: SortingState;
  readonly columnFilters: ColumnFiltersState;
  readonly globalFilter: string;
  readonly pagination: PaginationState;
  readonly rowSelection: RowSelectionState;
  readonly columnSizing: ColumnSizingState;
  readonly columnVisibility: VisibilityState;
  readonly columnOrder: ColumnOrderState;
  readonly columnPinning: ColumnPinningState;
  readonly expanded: ExpandedState;
  readonly grouping: GroupingState;
  readonly density: 'compact' | 'standard' | 'comfortable';
}

/** Loader return value for kjTableResource. Matches TanStack manualPagination + rowCount. */
export interface KjResourceResult<TData> {
  readonly rows: readonly TData[];
  readonly rowCount: number;
}
