import { InjectionToken } from '@angular/core';
import type { Column, Table } from '@tanstack/angular-table';

/**
 * Context passed to every built-in filter UI. Resolves the TanStack
 * `Column` whose filter value the input writes, and the parent `Table`
 * for cross-column wiring (e.g. faceted unique values).
 */
export interface KjFilterContext<TData = unknown> {
  readonly column: Column<TData, unknown>;
  readonly table: Table<TData>;
}

/** DI token used to inject the `KjFilterContext` into filter components. */
export const KJ_FILTER_CONTEXT = new InjectionToken<KjFilterContext>('KjTableFilter');
