import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  kjTableInfiniteResource,
  type KjTableInfiniteLoadParams,
  type KjTableInfinitePage,
} from './table-infinite-resource';

interface Item {
  readonly id: number;
  readonly tag: string;
}

interface Call {
  readonly params: KjTableInfiniteLoadParams<{ q: string }>;
  resolve(page: KjTableInfinitePage<Item>): void;
  reject(error: unknown): void;
}

/** A loader whose every call waits for the test to settle it. */
function controlledLoader(): {
  calls: Call[];
  loader: (params: KjTableInfiniteLoadParams<{ q: string }>) => Promise<KjTableInfinitePage<Item>>;
} {
  const calls: Call[] = [];
  return {
    calls,
    loader: (params) =>
      new Promise((resolve, reject) => {
        calls.push({ params, resolve, reject });
      }),
  };
}

/** Rows `offset..offset+limit` of a `total`-row result set tagged with `tag`. */
function page(offset: number, limit: number, total: number, tag = 'a'): KjTableInfinitePage<Item> {
  const rows: Item[] = [];
  for (let i = offset; i < Math.min(offset + limit, total); i++) rows.push({ id: i, tag });
  return { rows, total };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
  TestBed.tick();
};

function setup(overscanPages = 0) {
  const q = signal('');
  const ctl = controlledLoader();
  const injector = TestBed.inject(Injector);
  const res = kjTableInfiniteResource<Item, { q: string }>({
    request: () => ({ q: q() }),
    pageSize: 10,
    overscanPages,
    loader: ctl.loader,
    injector,
  });
  return { q, res, calls: ctl.calls };
}

describe('kjTableInfiniteResource', () => {
  it('loads the first page on start and sizes rows to the total', async () => {
    const { res, calls } = setup();
    TestBed.tick();
    await flush();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.params).toMatchObject({ request: { q: '' }, offset: 0, limit: 10 });
    expect(res.isResetting()).toBe(true);

    calls[0]!.resolve(page(0, 10, 95));
    await flush();
    expect(res.isResetting()).toBe(false);
    expect(res.total()).toBe(95);
    expect(res.rows()).toHaveLength(95);
    expect(res.rows()[9]).toEqual({ id: 9, tag: 'a' });
    expect(res.rows()[10]).toBeUndefined();
    expect(res.resets()).toBe(1);
  });

  it('fetches the missing pages of the visible range, never a loaded one twice', async () => {
    const { res, calls } = setup();
    TestBed.tick();
    await flush();
    calls[0]!.resolve(page(0, 10, 100));
    await flush();

    res.setRange({ startIndex: 5, endIndex: 24 });
    await flush();
    expect(calls.slice(1).map((c) => c.params.offset)).toEqual([10, 20]);
    expect(res.isFetchingMore()).toBe(true);

    calls[1]!.resolve(page(10, 10, 100));
    calls[2]!.resolve(page(20, 10, 100));
    await flush();
    expect(res.isFetchingMore()).toBe(false);
    expect(res.rows()[24]).toEqual({ id: 24, tag: 'a' });

    res.setRange({ startIndex: 0, endIndex: 29 });
    await flush();
    expect(calls).toHaveLength(3);
  });

  it('adds overscan pages around the range, clamped to the total', async () => {
    const { res, calls } = setup(1);
    TestBed.tick();
    await flush();
    calls[0]!.resolve(page(0, 10, 45));
    await flush();
    // The top of the list already prefetches the page below it.
    expect(calls[1]!.params.offset).toBe(10);

    res.setRange({ startIndex: 31, endIndex: 38 });
    await flush();
    // Page 3 in view, page 2 above; page 4 below is the last one (40..44).
    expect(calls.slice(2).map((c) => c.params.offset)).toEqual([20, 30, 40]);
    expect(calls[1]!.params.abortSignal.aborted).toBe(true);
  });

  it('aborts a page load once the range scrolls past it', async () => {
    const { res, calls } = setup();
    TestBed.tick();
    await flush();
    calls[0]!.resolve(page(0, 10, 1000));
    await flush();

    res.setRange({ startIndex: 100, endIndex: 105 });
    await flush();
    const far = calls[1]!;
    expect(far.params.offset).toBe(100);

    res.setRange({ startIndex: 500, endIndex: 505 });
    await flush();
    expect(far.params.abortSignal.aborted).toBe(true);
    // A late answer for the aborted page is ignored.
    far.resolve(page(100, 10, 1000));
    await flush();
    expect(res.rows()[100]).toBeUndefined();
  });

  it('resets on a request change: aborts, keeps the old rows until the new first page lands', async () => {
    const { q, res, calls } = setup();
    TestBed.tick();
    await flush();
    calls[0]!.resolve(page(0, 10, 100, 'old'));
    await flush();
    res.setRange({ startIndex: 40, endIndex: 45 });
    await flush();
    const pending = calls[1]!;

    q.set('x');
    TestBed.tick();
    await flush();
    expect(pending.params.abortSignal.aborted).toBe(true);
    expect(res.isResetting()).toBe(true);
    expect(res.rows()[0]).toEqual({ id: 0, tag: 'old' });

    const reset = calls[2]!;
    expect(reset.params).toMatchObject({ request: { q: 'x' }, offset: 0 });
    reset.resolve(page(0, 10, 30, 'new'));
    await flush();
    expect(res.isResetting()).toBe(false);
    expect(res.total()).toBe(30);
    expect(res.rows()[0]).toEqual({ id: 0, tag: 'new' });
    expect(res.resets()).toBe(2);
  });

  it('ignores the answer of a superseded reset', async () => {
    const { q, res, calls } = setup();
    TestBed.tick();
    await flush();
    q.set('x');
    TestBed.tick();
    await flush();
    expect(calls[0]!.params.abortSignal.aborted).toBe(true);
    calls[0]!.resolve(page(0, 10, 100, 'stale'));
    calls[1]!.resolve(page(0, 10, 20, 'fresh'));
    await flush();
    expect(res.total()).toBe(20);
    expect(res.rows()[0]?.tag).toBe('fresh');
  });

  it('silent reload refreshes the pages in view and keeps every loaded row', async () => {
    const { res, calls } = setup();
    TestBed.tick();
    await flush();
    calls[0]!.resolve(page(0, 10, 100, 'v1'));
    await flush();
    res.setRange({ startIndex: 30, endIndex: 35 });
    await flush();
    calls[1]!.resolve(page(30, 10, 100, 'v1'));
    await flush();

    res.reload({ silent: true });
    await flush();
    expect(res.isResetting()).toBe(false);
    expect(res.isRefreshing()).toBe(true);
    // Only the page in view refetches; page 0 stays on screen meanwhile.
    expect(calls.slice(2).map((c) => c.params.offset)).toEqual([30]);
    expect(res.rows()[0]?.tag).toBe('v1');

    calls[2]!.resolve(page(30, 10, 100, 'v2'));
    await flush();
    expect(res.isRefreshing()).toBe(false);
    expect(res.rows()[30]?.tag).toBe('v2');
    expect(res.rows()[0]?.tag).toBe('v1');
    expect(res.resets()).toBe(1);

    // The stale page refetches once it is back in view.
    res.setRange({ startIndex: 0, endIndex: 5 });
    await flush();
    expect(calls.slice(3).map((c) => c.params.offset)).toEqual([0]);
  });

  it('a non-silent reload resets from the top', async () => {
    const { res, calls } = setup();
    TestBed.tick();
    await flush();
    calls[0]!.resolve(page(0, 10, 100));
    await flush();
    res.reload();
    await flush();
    expect(res.isResetting()).toBe(true);
    expect(calls[1]!.params.offset).toBe(0);
  });

  it('surfaces a failed load through error() and clears it on the next success', async () => {
    const { res, calls } = setup();
    TestBed.tick();
    await flush();
    calls[0]!.resolve(page(0, 10, 100));
    await flush();
    res.setRange({ startIndex: 20, endIndex: 22 });
    await flush();
    calls[1]!.reject(new Error('boom'));
    await flush();
    expect((res.error() as Error).message).toBe('boom');

    res.setRange({ startIndex: 50, endIndex: 52 });
    await flush();
    calls[2]!.resolve(page(50, 10, 100));
    await flush();
    expect(res.error()).toBeNull();
  });
});
