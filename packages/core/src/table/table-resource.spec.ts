import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { kjTableResource } from './table-resource';
import type { KjTableState } from './table.types';

const initialState: KjTableState = {
  sorting: [], columnFilters: [], globalFilter: '',
  pagination: { pageIndex: 0, pageSize: 25 },
  rowSelection: {}, columnSizing: {}, columnVisibility: {},
  columnOrder: [], columnPinning: { left: [], right: [] },
  expanded: {}, grouping: [], density: 'standard',
};

describe('kjTableResource', () => {
  it('starts in loading state then resolves', async () => {
    const r = TestBed.runInInjectionContext(() => kjTableResource<{ id: string }>({
      stateSignal: signal(initialState),
      loader: async () => ({ rows: [{ id: '1' }], rowCount: 1 }),
    }));
    expect(r.status()).toBe('loading');
    await new Promise(res => setTimeout(res));
    expect(r.status()).toBe('resolved');
    expect(r.value()).toEqual({ rows: [{ id: '1' }], rowCount: 1 });
  });

  it('re-loads when state signal changes', async () => {
    const loader = vi.fn(async () => ({ rows: [], rowCount: 0 }));
    const state = signal(initialState);
    TestBed.runInInjectionContext(() => kjTableResource({ stateSignal: state, loader }));
    await new Promise(res => setTimeout(res));
    expect(loader).toHaveBeenCalledTimes(1);
    state.set({ ...initialState, pagination: { pageIndex: 1, pageSize: 25 } });
    await new Promise(res => setTimeout(res));
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
