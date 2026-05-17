import type { ColumnDef, RowData } from '@tanstack/angular-table';
import type { KjColumnDef, KjColumnMeta } from './table.types';

const KJ_KEYS = [
  'kjType', 'kjEditable', 'kjFilterable', 'kjPin', 'kjGroup', 'kjAgg',
  'kjEditor', 'kjFilterUi', 'kjSelectOptions', 'kjExportable', 'kjPersist',
] as const;

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
