import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  KJ_TABLE_STORAGE,
  inMemoryAdapter,
  localStorageAdapter,
  sessionStorageAdapter,
  provideKjTableStorage,
  type KjStorageAdapter,
} from './table-storage';

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
