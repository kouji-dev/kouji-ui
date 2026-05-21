import {
  InjectionToken,
  Injector,
  Provider,
  TemplateRef,
  Type,
  inject,
  type Signal,
} from '@angular/core';
import type { Column, RowData } from '@tanstack/angular-table';
import type { KjColumnApi, KjGridApi } from './grid-api';

/**
 * Context handed to every custom filter — component class or template.
 *
 * Mirrors AG-Grid's `IFilterParams` shape: the column being filtered, the
 * grid + column APIs for cross-cutting actions, the current model as a
 * reactive signal, and an imperative setter that clears the filter on
 * `null`/`undefined`/`''`. A signal is used (rather than a callback) so
 * filter UIs can derive bound values via `computed()` without their own
 * change-detection plumbing.
 *
 * Components either accept a single required input named `params` of this
 * shape, or call {@link injectKjFilterParams}. Templates receive the same
 * context via `$implicit` (`let-params`).
 */
export interface KjFilterParams<TData extends RowData = unknown, TValue = unknown> {
  /** The TanStack column the filter targets. */
  readonly column: Column<TData, TValue>;
  /** Grid-wide imperative API for cross-column actions. */
  readonly api: KjGridApi<TData>;
  /** Per-column imperative API. */
  readonly columnApi: KjColumnApi<TData>;
  /** Live filter model — reactive view of `column.getFilterValue()`. */
  readonly model: Signal<TValue | null>;
  /** Imperative setter. `null`, `undefined`, or `''` clear the filter. */
  setModel(value: TValue | null | undefined): void;
  /** True when the filter currently restricts results. */
  isActive(): boolean;
  /** Convenience: clear this filter. Equivalent to `setModel(null)`. */
  clear(): void;
}

/**
 * Anything that can render a filter UI: a standalone component class or a
 * `TemplateRef` whose `$implicit` context is a `KjFilterParams`.
 */
export type KjFilterRenderer<TData extends RowData = unknown, TValue = unknown> =
  | Type<{ params?: unknown } & object>
  | TemplateRef<KjFilterParams<TData, TValue>>;

/**
 * Private token. Use {@link provideKjFilterParams} / {@link injectKjFilterParams}
 * — the token itself is not exported from the package so consumers cannot
 * bypass the helpers (and can't accidentally provide a malformed value).
 */
const KJ_FILTER_PARAMS = new InjectionToken<KjFilterParams>('kj.filter.params');

/**
 * Returns a `Provider` that exposes a `KjFilterParams` instance to a child
 * injector. Used by `KjTableFilterOutlet` and the styled-wrapper's filter
 * mounting code; user code should normally not call this directly.
 */
export function provideKjFilterParams<TData extends RowData, TValue>(
  params: KjFilterParams<TData, TValue>,
): Provider {
  return { provide: KJ_FILTER_PARAMS, useValue: params };
}

/**
 * Resolve the active `KjFilterParams` from the current injection context.
 *
 * @example
 * ```ts
 * @Component({ selector: 'my-filter', template: '…' })
 * class MyFilter {
 *   protected readonly params = injectKjFilterParams<User, string>();
 *   protected onInput(v: string) { this.params.setModel(v || null); }
 * }
 * ```
 */
export function injectKjFilterParams<
  TData extends RowData = unknown,
  TValue = unknown,
>(injector?: Injector): KjFilterParams<TData, TValue> {
  const params = injector
    ? injector.get(KJ_FILTER_PARAMS)
    : inject(KJ_FILTER_PARAMS);
  return params as KjFilterParams<TData, TValue>;
}
