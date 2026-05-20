/**
 * Structured filter models — a near-direct adaptation of AG-Grid's
 * `FilterModel` shape. Each built-in filter writes one of these models
 * to `column.setFilterValue(...)` instead of a raw value. The structured
 * shape buys two things:
 *
 * 1. **Server-side rendering.** `gridApi.filter.getModel()` returns a
 *    `KjGridFilterModel` (`Record<columnId, KjFilterModel>`) that
 *    serialises cleanly into a JSON payload your backend can translate
 *    to SQL/Mongo/etc. without re-parsing free-form values. Pair with
 *    `kjTableResource({ loader })` to fan changes back to the server.
 *
 * 2. **Cross-filter introspection.** Code that needs to "what does the
 *    user currently have selected on column X" can discriminate on
 *    `filterType` and `type` instead of guessing from a `string | unknown`
 *    value.
 *
 * The companion `filter-fns` helpers (`kjTextFilterFn` etc.) implement
 * client-side filtering against these models so client-mode tables work
 * out of the box — point `kjColumn({ filterFn: kjTextFilterFn })` at one
 * and TanStack will dispatch row matching for you.
 */

/** Comparison operators for {@link KjTextFilterModel}. */
export type KjTextFilterType =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'blank'
  | 'notBlank';

export interface KjTextFilterModel {
  readonly filterType: 'text';
  readonly type: KjTextFilterType;
  /** Match string. Omitted for `blank` / `notBlank`. */
  readonly filter?: string;
  /** Case-insensitive matching. Defaults to `true`. */
  readonly caseSensitive?: boolean;
}

/** Comparison operators for {@link KjNumberFilterModel}. */
export type KjNumberFilterType =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'inRange'
  | 'blank'
  | 'notBlank';

export interface KjNumberFilterModel {
  readonly filterType: 'number';
  readonly type: KjNumberFilterType;
  /** Primary number. Omitted for `blank` / `notBlank`. */
  readonly filter?: number;
  /** Range upper bound — used by `inRange`. */
  readonly filterTo?: number;
}

/** Comparison operators for {@link KjDateFilterModel}. */
export type KjDateFilterType =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'      // after
  | 'lessThan'         // before
  | 'inRange'
  | 'blank'
  | 'notBlank';

export interface KjDateFilterModel {
  readonly filterType: 'date';
  readonly type: KjDateFilterType;
  /** Primary date — ISO `YYYY-MM-DD`. */
  readonly dateFrom?: string;
  /** Range upper bound — used by `inRange`. */
  readonly dateTo?: string;
}

/**
 * Set / multi-select filter — the row passes if the cell value is in
 * `values`. An empty `values` array means "no filter" (cleared); pair
 * with `setFilterValue(undefined)` for the cleared state by preference.
 */
export interface KjSetFilterModel {
  readonly filterType: 'set';
  readonly values: readonly unknown[];
}

/** Compound filter — combine two conditions with AND / OR. */
export interface KjMultiConditionFilterModel<TModel extends KjFilterModel = KjFilterModel> {
  readonly filterType: 'multi';
  readonly operator: 'AND' | 'OR';
  readonly conditions: readonly TModel[];
}

/** Discriminated union of every built-in filter model. */
export type KjFilterModel =
  | KjTextFilterModel
  | KjNumberFilterModel
  | KjDateFilterModel
  | KjSetFilterModel
  | KjMultiConditionFilterModel;

/**
 * Bulk filter snapshot — keyed by column id. Shape mirrors AG-Grid's
 * `api.getFilterModel()` return so SSR loaders that already understand
 * AG-Grid payloads can consume it as-is.
 */
export type KjGridFilterModel = Record<string, KjFilterModel>;

/** Narrowing helper. */
export function isKjFilterModel(value: unknown): value is KjFilterModel {
  return (
    !!value &&
    typeof value === 'object' &&
    'filterType' in (value as object) &&
    typeof (value as { filterType: unknown }).filterType === 'string'
  );
}
