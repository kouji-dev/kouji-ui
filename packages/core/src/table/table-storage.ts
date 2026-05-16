import { InjectionToken, Provider } from '@angular/core';

/**
 * Adapter contract for persisting `<kj-data-table>` state. The default
 * factory yields an in-memory adapter in non-browser environments and a
 * localStorage adapter in the browser.
 */
export interface KjStorageAdapter {
  read<T>(key: string): T | null;
  write<T>(key: string, value: T): void;
}

export interface LocalStorageAdapterOptions { keyPrefix?: string; }
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

const safeLocal = (): Storage | null => {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
};
const safeSession = (): Storage | null => {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; }
};

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
