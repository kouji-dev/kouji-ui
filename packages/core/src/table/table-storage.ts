import { InjectionToken, Provider } from '@angular/core';
import type { KjTablePersistedSlice, KjTableState } from './table.types';

/**
 * Adapter contract for persisting `<kj-table>` state. The default
 * factory yields an in-memory adapter in non-browser environments and a
 * localStorage adapter in the browser.
 */
export interface KjStorageAdapter {
  read<T>(key: string): T | null;
  write<T>(key: string, value: T): void;
}

/** Options for {@link localStorageAdapter}. `keyPrefix` defaults to `''`. */
export interface LocalStorageAdapterOptions { keyPrefix?: string; }

/** Options for {@link sessionStorageAdapter}. `keyPrefix` defaults to `''`. */
export interface SessionStorageAdapterOptions { keyPrefix?: string; }

/** Per-instance in-memory adapter. Survives nothing. Default in SSR/tests. */
export function inMemoryAdapter(): KjStorageAdapter {
  const store = new Map<string, unknown>();
  return {
    read: <T>(k: string): T | null => store.has(k) ? (store.get(k) as T) : null,
    write: <T>(k: string, v: T) => { store.set(k, v); },
  };
}

function wrap(get: () => Storage | null, prefix = ''): KjStorageAdapter {
  return {
    read<T>(k: string): T | null {
      const s = get();
      if (!s) return null;
      const raw = s.getItem(prefix + k);
      if (raw == null) return null;
      try { return JSON.parse(raw) as T; } catch { return null; }
    },
    write<T>(k: string, v: T) {
      const s = get();
      if (!s) return;
      try { s.setItem(prefix + k, JSON.stringify(v)); } catch { /* quota / serialization */ }
    },
  };
}

// Read off `globalThis` rather than the bare bindings: these are free
// functions a consumer calls from anywhere (including a provider factory that
// runs on the server), so there is no injector to ask, and the `try` also
// covers a browser that throws on access under a blocked-storage policy.
const webStorage = (key: 'localStorage' | 'sessionStorage'): Storage | null => {
  try {
    return (globalThis as Partial<Record<typeof key, Storage>>)[key] ?? null;
  } catch {
    return null;
  }
};
const safeLocal = (): Storage | null => webStorage('localStorage');
const safeSession = (): Storage | null => webStorage('sessionStorage');

/** Adapter backed by `localStorage`. No-ops in SSR. Optional `keyPrefix`. */
export function localStorageAdapter(opts: LocalStorageAdapterOptions = {}): KjStorageAdapter {
  return wrap(safeLocal, opts.keyPrefix ?? '');
}

/** Adapter backed by `sessionStorage`. No-ops in SSR. Optional `keyPrefix`. */
export function sessionStorageAdapter(opts: SessionStorageAdapterOptions = {}): KjStorageAdapter {
  return wrap(safeSession, opts.keyPrefix ?? '');
}

/** Default smart adapter — localStorage in browser, in-memory otherwise. */
function defaultAdapter(): KjStorageAdapter {
  return safeLocal() ? localStorageAdapter() : inMemoryAdapter();
}

/**
 * DI token for the active table storage adapter. Default factory yields a
 * smart adapter (localStorage in browser, in-memory otherwise). Override via
 * `provideKjTableStorage(...)` at app scope or `[kjStorageAdapter]` per table.
 */
export const KJ_TABLE_STORAGE = new InjectionToken<KjStorageAdapter>('kj.table.storage', {
  factory: defaultAdapter,
});

/** Configures the app-wide table storage adapter. */
export function provideKjTableStorage(adapter: KjStorageAdapter): Provider {
  return { provide: KJ_TABLE_STORAGE, useValue: adapter };
}

/**
 * Namespace prepended to every `kjStorageKey` before it reaches the adapter.
 * Empty by default, so keys are exactly what the table was given. Set it when
 * several apps share one origin's storage (a docs site and a product, two
 * deployments under one domain) so a table keyed `"users"` in one app never
 * reads the other's column layout. Composes with an adapter's own `keyPrefix`.
 * Micro-frontend isolation is not a supported target; this prefix is a plain
 * namespacing knob.
 */
export const KJ_TABLE_STORAGE_KEY_PREFIX = new InjectionToken<string>('KjTableStorageKeyPrefix', {
  factory: () => '',
});

/** Configures the app-wide storage key namespace. @param prefix Prepended verbatim, e.g. `'billing:'`. */
export function provideKjTableStorageKeyPrefix(prefix: string): Provider {
  return { provide: KJ_TABLE_STORAGE_KEY_PREFIX, useValue: prefix };
}

/**
 * Slices `<kj-table>` persists by default: everything a user configures about
 * the view — sorting, column filters, pagination, column sizing / visibility /
 * order / pinning, grouping and density. `rowSelection`, `expanded` and
 * `globalFilter` are session state and stay out unless opted in through
 * `kjPersistedSlices`.
 */
export const KJ_TABLE_DEFAULT_PERSISTED_SLICES: readonly KjTablePersistedSlice[] = [
  'sorting',
  'columnFilters',
  'pagination',
  'columnSizing',
  'columnVisibility',
  'columnOrder',
  'columnPinning',
  'grouping',
  'density',
];

/**
 * Project a table state onto the slices worth persisting.
 * @param state Full or partial state — a stored blob may predate the slice list.
 * @param slices Slices to keep.
 * @returns A new object holding only the requested slices present on `state`.
 */
export function pickTableState(
  state: Partial<KjTableState>,
  slices: readonly KjTablePersistedSlice[],
): Partial<KjTableState> {
  const out: Record<string, unknown> = {};
  for (const slice of slices) {
    if (slice in state) out[slice] = state[slice];
  }
  return out as Partial<KjTableState>;
}
