// packages/core/src/primitives/list/filterable-list.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { KjFilterableList } from './filterable-list';
import { KJ_LIST_NAVIGATOR_CONFIG, type KjFilterFn } from './tokens';
import type { KjListItem } from './item';

function fakeItem(id: string, label: string, keywords: readonly string[] = []): KjListItem<unknown> {
  const _visible = signal(true);
  const _posInSet = signal<number | null>(null);
  const _setSize = signal<number | null>(null);
  return {
    id,
    label: () => label,
    haystacks: () => [label, ...keywords],
    disabled: () => false,
    visible: _visible,
    setVisible: (v: boolean) => _visible.set(v),
    posInSet: _posInSet,
    setSize: _setSize,
  } as unknown as KjListItem<unknown>;
}

describe('KjFilterableList', () => {
  let items: WritableSignal<readonly KjListItem<unknown>[]>;
  let svc: KjFilterableList;
  let query: WritableSignal<string>;
  let filterFn: WritableSignal<KjFilterFn>;
  let shouldFilter: WritableSignal<boolean>;
  let autoActivateFirst: WritableSignal<boolean>;

  beforeEach(() => {
    items = signal<readonly KjListItem<unknown>[]>([
      fakeItem('1', 'Apple'),
      fakeItem('2', 'Banana'),
      fakeItem('3', 'Apricot'),
    ]);
    query = signal('');
    filterFn = signal<KjFilterFn>((q, hs) => {
      if (!q) return 1;
      const needle = q.toLowerCase();
      return hs.some(h => h.toLowerCase().includes(needle)) ? 1 : 0;
    });
    shouldFilter = signal(true);
    autoActivateFirst = signal(true);

    TestBed.configureTestingModule({
      providers: [
        KjFilterableList,
        { provide: KJ_LIST_NAVIGATOR_CONFIG, useValue: { items } },
      ],
    });
    svc = TestBed.inject(KjFilterableList);
    svc.bind({ query, filterFn, shouldFilter, autoActivateFirst });
    TestBed.flushEffects();
  });

  it('default substring filter — empty query returns all items', () => {
    expect(svc.visibleItems().length).toBe(3);
  });

  it('substring filter narrows results when query changes', () => {
    query.set('ap');
    TestBed.flushEffects();
    expect(svc.visibleItems().map(i => i.id)).toEqual(['1', '3']);
  });

  it('marks filtered-out items as not visible via setVisible(false)', () => {
    query.set('ap');
    TestBed.flushEffects();
    const all = items();
    expect(all[0].visible()).toBe(true);   // Apple
    expect(all[1].visible()).toBe(false);  // Banana
    expect(all[2].visible()).toBe(true);   // Apricot
  });

  it('isEmpty signal flips on no-result query', () => {
    expect(svc.isEmpty()).toBe(false);
    query.set('zzz');
    TestBed.flushEffects();
    expect(svc.isEmpty()).toBe(true);
  });

  it('shouldFilter=false bypasses filter and shows all', () => {
    query.set('zzz');
    shouldFilter.set(false);
    TestBed.flushEffects();
    expect(svc.visibleItems().length).toBe(3);
  });

  it('custom filter fn applied when the bound signal updates', () => {
    filterFn.set((q, hs) => hs.some(h => h.endsWith(q)) ? 1 : 0);
    query.set('cot');
    TestBed.flushEffects();
    expect(svc.visibleItems().map(i => i.id)).toEqual(['3']);
  });

  it('stamps posInSet/setSize on visible items, clears them on hidden items', () => {
    query.set('ap');
    TestBed.flushEffects();
    const all = items();
    expect(all[0].posInSet()).toBe(1);
    expect(all[0].setSize()).toBe(2);
    expect(all[1].posInSet()).toBeNull();
    expect(all[2].posInSet()).toBe(2);
  });

  it('announcement signal returns "N results" / "No results"', () => {
    query.set('ap');
    TestBed.flushEffects();
    expect(svc.announcement()).toBe('2 results');
    query.set('zzz');
    TestBed.flushEffects();
    expect(svc.announcement()).toBe('No results');
  });
});
