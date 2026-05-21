import { resource, Signal, type ResourceRef } from '@angular/core';
import type { KjTableState, KjResourceResult } from './table.types';

export interface KjTableResourceOptions<TData, TRequest = unknown> {
  /** Signal carrying the table's current state. Wired into the resource request. */
  stateSignal: Signal<KjTableState>;
  /** Optional extra request inputs — merged into the loader's `request` arg. */
  request?: Signal<TRequest> | (() => TRequest);
  /** Async loader. Receives the current table state + extra request + abort signal. */
  loader: (ctx: {
    state: KjTableState;
    request: TRequest | undefined;
    abortSignal: AbortSignal;
  }) => Promise<KjResourceResult<TData>>;
}

/**
 * Resource that wires the table's state signal into Angular's `resource()`.
 * The loader is re-invoked whenever the state (or optional extra request)
 * changes. Aborts in-flight loads on changes.
 */
export function kjTableResource<TData, TRequest = unknown>(
  opts: KjTableResourceOptions<TData, TRequest>,
): ResourceRef<KjResourceResult<TData> | undefined> {
  const requestSig = opts.request
    ? (typeof opts.request === 'function' ? opts.request : () => opts.request!())
    : () => undefined;
  return resource<KjResourceResult<TData>, { state: KjTableState; request: TRequest | undefined }>({
    params: () => ({ state: opts.stateSignal(), request: requestSig() as TRequest | undefined }),
    loader: ({ params, abortSignal }) => opts.loader({
      state: params.state,
      request: params.request,
      abortSignal,
    }),
  });
}
