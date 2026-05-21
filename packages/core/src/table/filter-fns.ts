import type { Row } from '@tanstack/angular-table';
import {
  isKjFilterModel,
  type KjDateFilterModel,
  type KjFilterModel,
  type KjMultiConditionFilterModel,
  type KjNumberFilterModel,
  type KjSetFilterModel,
  type KjTextFilterModel,
} from './filter-models';

/**
 * TanStack `filterFn` for {@link KjTextFilterModel}. Accepts the model as
 * the filter value and dispatches on `model.type`. Tolerates a bare
 * string (legacy "contains" raw value) so users migrating filters one at
 * a time don't have to flip every column simultaneously.
 *
 * Usage:
 * ```ts
 * kjColumn<User>({ accessorKey: 'name', filterFn: kjTextFilterFn })
 * ```
 */
export function kjTextFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  if (filterValue == null || filterValue === '') return true;

  // Legacy raw-string compatibility — treated as `contains`.
  if (typeof filterValue === 'string') {
    return contains(read(row, columnId), filterValue, /* caseSensitive */ false);
  }

  if (!isKjFilterModel(filterValue) || filterValue.filterType !== 'text') return true;
  const model = filterValue as KjTextFilterModel;
  const cell  = read(row, columnId);
  const cs    = model.caseSensitive === true;

  switch (model.type) {
    case 'blank':    return cell == null || cell === '';
    case 'notBlank': return cell != null && cell !== '';
    case 'equals':       return text(cell, cs) === text(model.filter ?? '', cs);
    case 'notEquals':    return text(cell, cs) !== text(model.filter ?? '', cs);
    case 'contains':     return contains(cell, model.filter ?? '', cs);
    case 'notContains':  return !contains(cell, model.filter ?? '', cs);
    case 'startsWith':   return text(cell, cs).startsWith(text(model.filter ?? '', cs));
    case 'endsWith':     return text(cell, cs).endsWith(text(model.filter ?? '', cs));
  }
}

/**
 * TanStack `filterFn` for {@link KjNumberFilterModel}. Tolerates a bare
 * `[min, max]` tuple as legacy raw value (treated as `inRange`).
 */
export function kjNumberFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  if (filterValue == null) return true;

  // Legacy `[min, max]` tuple → inRange.
  if (Array.isArray(filterValue)) {
    const [min, max] = filterValue as [number | undefined, number | undefined];
    return inNumberRange(Number(read(row, columnId)), min, max);
  }

  if (!isKjFilterModel(filterValue) || filterValue.filterType !== 'number') return true;
  const model = filterValue as KjNumberFilterModel;
  const cell  = Number(read(row, columnId));

  if (model.type === 'blank')    return Number.isNaN(cell);
  if (model.type === 'notBlank') return !Number.isNaN(cell);

  // `inRange` is the one operator where a missing `filter` is still
  // meaningful — it just leaves the lower bound open. Every other operator
  // needs an explicit `filter`, so we treat its absence as "no filter".
  if (model.type === 'inRange') {
    if (model.filter == null && model.filterTo == null) return true;
    return inNumberRange(cell, model.filter, model.filterTo);
  }

  const value = model.filter;
  if (value == null) return true;

  switch (model.type) {
    case 'equals':              return cell === value;
    case 'notEquals':           return cell !== value;
    case 'greaterThan':         return cell  >  value;
    case 'greaterThanOrEqual':  return cell  >= value;
    case 'lessThan':            return cell  <  value;
    case 'lessThanOrEqual':     return cell  <= value;
  }
  return true;
}

/**
 * TanStack `filterFn` for {@link KjDateFilterModel}. Compares ISO date
 * strings as calendar dates (no time component, no TZ math). Tolerates a
 * `[from, to]` tuple of ISO strings as legacy raw value.
 */
export function kjDateFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  if (filterValue == null) return true;

  if (Array.isArray(filterValue)) {
    const [from, to] = filterValue as [string | undefined, string | undefined];
    return inIsoRange(isoOf(read(row, columnId)), from, to);
  }

  if (!isKjFilterModel(filterValue) || filterValue.filterType !== 'date') return true;
  const model = filterValue as KjDateFilterModel;
  const cell  = isoOf(read(row, columnId));

  if (model.type === 'blank')    return !cell;
  if (model.type === 'notBlank') return !!cell;
  if (!cell) return false;

  switch (model.type) {
    case 'equals':       return cell === model.dateFrom;
    case 'notEquals':    return cell !== model.dateFrom;
    case 'greaterThan':  return !!model.dateFrom && cell  > model.dateFrom;
    case 'lessThan':     return !!model.dateFrom && cell  < model.dateFrom;
    case 'inRange':      return inIsoRange(cell, model.dateFrom, model.dateTo);
  }
}

/**
 * TanStack `filterFn` for {@link KjSetFilterModel}. The row passes if the
 * cell's stringified value matches any selected entry. Tolerates a bare
 * (non-array) value as legacy raw equality.
 */
export function kjSetFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  if (filterValue == null) return true;

  if (!isKjFilterModel(filterValue)) {
    return Object.is(read(row, columnId), filterValue);
  }

  if (filterValue.filterType !== 'set') return true;
  const model = filterValue as KjSetFilterModel;
  if (model.values.length === 0) return true;
  const cell = read(row, columnId);
  return model.values.some((v) => Object.is(v, cell));
}

/**
 * TanStack `filterFn` for {@link KjMultiConditionFilterModel}.
 * Recursively delegates each condition to the matching helper based on
 * `condition.filterType`.
 */
export function kjMultiFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  if (!isKjFilterModel(filterValue) || filterValue.filterType !== 'multi') return true;
  const model = filterValue as KjMultiConditionFilterModel;
  const reduce = model.operator === 'AND'
    ? model.conditions.every.bind(model.conditions)
    : model.conditions.some.bind(model.conditions);
  return reduce((c) => evaluate(row, columnId, c));
}

/** Dispatch a single model against the correct typed helper. */
function evaluate<TData>(
  row: Row<TData>,
  columnId: string,
  model: KjFilterModel,
): boolean {
  switch (model.filterType) {
    case 'text':   return kjTextFilterFn(row, columnId, model);
    case 'number': return kjNumberFilterFn(row, columnId, model);
    case 'date':   return kjDateFilterFn(row, columnId, model);
    case 'set':    return kjSetFilterFn(row, columnId, model);
    case 'multi':  return kjMultiFilterFn(row, columnId, model);
  }
}

// ── primitives ─────────────────────────────────────────────────────────────

function read<TData>(row: Row<TData>, columnId: string): unknown {
  return row.getValue(columnId);
}
function text(value: unknown, caseSensitive: boolean): string {
  const s = value == null ? '' : String(value);
  return caseSensitive ? s : s.toLowerCase();
}
function contains(cell: unknown, needle: string, caseSensitive: boolean): boolean {
  return text(cell, caseSensitive).includes(text(needle, caseSensitive));
}
function inNumberRange(
  cell: number,
  min: number | undefined,
  max: number | undefined,
): boolean {
  if (Number.isNaN(cell)) return false;
  if (min !== undefined && cell < min) return false;
  if (max !== undefined && cell > max) return false;
  return true;
}
function inIsoRange(
  cell: string | undefined,
  from: string | undefined,
  to: string | undefined,
): boolean {
  if (!cell) return false;
  if (from && cell < from) return false;
  if (to   && cell > to)   return false;
  return true;
}
function isoOf(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'string') return value.slice(0, 10);
  return undefined;
}
