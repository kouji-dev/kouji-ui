import type { ColumnDef, FilterFn, RowData } from '@tanstack/angular-table';
import {
  kjDateFilterFn,
  kjNumberFilterFn,
  kjSetFilterFn,
  kjTextFilterFn,
} from './filter-fns';
import type { KjColumnDef, KjColumnMeta, KjColumnType } from './table.types';

const KJ_KEYS = [
  'kjType', 'kjEditable', 'kjFilterable', 'kjPin', 'kjGroup', 'kjAgg',
  'kjEditor', 'kjFilterUi', 'kjSelectOptions', 'kjExportable', 'kjPersist',
] as const;

/** Auto-wired matcher per `kjType`. Picked up only when the column def
 *  doesn't already supply its own `filterFn`. */
const DEFAULT_FILTER_FNS: Readonly<Record<KjColumnType, FilterFn<unknown>>> = {
  text:    kjTextFilterFn   as unknown as FilterFn<unknown>,
  number:  kjNumberFilterFn as unknown as FilterFn<unknown>,
  date:    kjDateFilterFn   as unknown as FilterFn<unknown>,
  select:  kjSetFilterFn    as unknown as FilterFn<unknown>,
  boolean: kjSetFilterFn    as unknown as FilterFn<unknown>,
};

/** Strip leading 'kj' and lowercase first char. */
function unprefix(k: string): keyof KjColumnMeta {
  return (k.slice(2, 3).toLowerCase() + k.slice(3)) as keyof KjColumnMeta;
}

/**
 * Define a column for `<kj-data-table>`. Pass-through for every TanStack
 * `ColumnDef` field; kj-specific top-level knobs (`kjType`, `kjEditable`,
 * `kjPin`, …) are hoisted into `meta.kj` for the wrapper to read.
 */
export function kjColumn<TData extends RowData>(def: KjColumnDef<TData>): ColumnDef<TData> {
  const kjMeta: Partial<KjColumnMeta<TData>> = {};
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(def)) {
    if ((KJ_KEYS as readonly string[]).includes(k)) {
      if (v !== undefined) kjMeta[unprefix(k)] = v as never;
    } else {
      rest[k] = v;
    }
  }
  const existingMeta = (rest['meta'] ?? {}) as Record<string, unknown>;
  const meta = Object.keys(kjMeta).length === 0
    ? existingMeta
    : { ...existingMeta, kj: kjMeta };

  // Auto-wire `filterFn` from `kjType` so columns built with `kjColumn({ ... })`
  // actually understand the structured `KjFilterModel` the built-in filter UIs
  // write. User-supplied `filterFn` always wins.
  if (rest['filterFn'] === undefined && kjMeta.type) {
    const fn = DEFAULT_FILTER_FNS[kjMeta.type as KjColumnType];
    if (fn) rest['filterFn'] = fn as unknown as FilterFn<TData>;
  }

  return { ...rest, meta } as unknown as ColumnDef<TData>;
}

/** Define a column group (header grouping). Children are `kjColumn()` defs. */
export function kjColumnGroup<TData extends RowData>(def: {
  id?: string;
  header: ColumnDef<TData>['header'];
  columns: ColumnDef<TData>[];
}): ColumnDef<TData> {
  return def as unknown as ColumnDef<TData>;
}
