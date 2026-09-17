import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  KJ_TABLE_DEFAULT_PERSISTED_SLICES,
  KJ_TABLE_STORAGE,
  KJ_TABLE_STORAGE_KEY_PREFIX,
  inMemoryAdapter,
  localStorageAdapter,
  pickTableState,
  provideKjTableStorage,
  provideKjTableStorageKeyPrefix,
  sessionStorageAdapter,
  type KjStorageAdapter,
} from './table-storage';
import type { KjTableState } from './table.types';

describe('KJ_TABLE_DEFAULT_PERSISTED_SLICES', () => {
  it('keeps view configuration and leaves session state out', () => {
    expect(KJ_TABLE_DEFAULT_PERSISTED_SLICES).toEqual(
      expect.arrayContaining(['sorting', 'columnFilters', 'pagination', 'columnSizing', 'columnVisibility', 'columnOrder', 'columnPinning', 'grouping', 'density']),
    );
    expect(KJ_TABLE_DEFAULT_PERSISTED_SLICES).not.toContain('rowSelection');
    expect(KJ_TABLE_DEFAULT_PERSISTED_SLICES).not.toContain('expanded');
    expect(KJ_TABLE_DEFAULT_PERSISTED_SLICES).not.toContain('globalFilter');
  });
});

describe('pickTableState', () => {
  const state: Partial<KjTableState> = {
    sorting: [{ id: 'name', desc: false }],
    rowSelection: { r1: true },
    density: 'compact',
  };

  it('returns only the requested slices', () => {
    expect(pickTableState(state, ['sorting', 'density'])).toEqual({
      sorting: [{ id: 'name', desc: false }],
      density: 'compact',
    });
  });

  it('skips requested slices the source does not carry, and never invents keys', () => {
    expect(pickTableState(state, ['columnOrder', 'rowSelection'])).toEqual({ rowSelection: { r1: true } });
  });

  it('returns a fresh object', () => {
    expect(pickTableState(state, ['sorting'])).not.toBe(state);
  });
});

describe('KJ_TABLE_STORAGE_KEY_PREFIX', () => {
  it('defaults to an empty namespace', () => {
    TestBed.configureTestingModule({ providers: [] });
    expect(TestBed.inject(KJ_TABLE_STORAGE_KEY_PREFIX)).toBe('');
  });

  it('provideKjTableStorageKeyPrefix binds the app-wide namespace', () => {
    TestBed.configureTestingModule({ providers: [provideKjTableStorageKeyPrefix('billing:')] });
    expect(TestBed.inject(KJ_TABLE_STORAGE_KEY_PREFIX)).toBe('billing:');
  });
});

describe('inMemoryAdapter', () => {
  it('round-trips values', () => {
    const a = inMemoryAdapter();
    expect(a.read('x')).toBeNull();
    a.write('x', { a: 1 });
    expect(a.read('x')).toEqual({ a: 1 });
  });
  it('isolates between instances', () => {
    const a = inMemoryAdapter();
    const b = inMemoryAdapter();
    a.write('k', 1);
    expect(b.read('k')).toBeNull();
  });
});

describe('localStorageAdapter', () => {
  beforeEach(() => localStorage.clear());
  it('round-trips through localStorage', () => {
    const a = localStorageAdapter();
    a.write('k', { a: 1 });
    expect(a.read('k')).toEqual({ a: 1 });
  });
  it('honours keyPrefix', () => {
    const a = localStorageAdapter({ keyPrefix: 'myapp:' });
    a.write('k', 1);
    expect(localStorage.getItem('myapp:k')).toBe('1');
  });
  it('returns null when value is corrupt JSON', () => {
    localStorage.setItem('k', '{bad json');
    expect(localStorageAdapter().read('k')).toBeNull();
  });
});

describe('sessionStorageAdapter', () => {
  beforeEach(() => sessionStorage.clear());
  it('round-trips through sessionStorage', () => {
    const a = sessionStorageAdapter();
    a.write('k', { a: 1 });
    expect(a.read('k')).toEqual({ a: 1 });
  });
});

describe('provideKjTableStorage', () => {
  it('binds adapter to KJ_TABLE_STORAGE token', () => {
    const mock: KjStorageAdapter = { read: vi.fn(() => null), write: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideKjTableStorage(mock)] });
    expect(TestBed.inject(KJ_TABLE_STORAGE)).toBe(mock);
  });

  it('default factory yields inMemory adapter when not provided', () => {
    TestBed.configureTestingModule({ providers: [] });
    const adapter = TestBed.inject(KJ_TABLE_STORAGE);
    expect(typeof adapter.read).toBe('function');
    expect(typeof adapter.write).toBe('function');
  });
});
