// packages/core/src/primitives/list/selection.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { KjSelectionModel } from './selection';
import { KJ_LIST_NAVIGATOR_CONFIG, type KjCompareFn, type KjTreeShape } from './tokens';
import type { KjListItem } from './item';

/**
 * Bind an explicit `value` signal so the model writes through it. Tests assert on this signal directly — same
 * way real consumers (KjSelect / KjCombobox) wire up.
 */
function setup<T>(): {
  m: KjSelectionModel<T>;
  value: WritableSignal<T | readonly T[] | null>;
} {
  const value = signal<T | readonly T[] | null>(null);
  TestBed.configureTestingModule({
    providers: [
      KjSelectionModel,
      {
        provide: KJ_LIST_NAVIGATOR_CONFIG,
        useValue: { items: signal([]), value },
      },
    ],
  });
  const m = TestBed.inject(KjSelectionModel) as KjSelectionModel<T>;
  // The model takes its canonical sources through `bind()`, exactly as
  // KjSelect / KjCombobox roots do in their constructors.
  m.bind({ value });
  return { m, value };
}

/**
 * Test tree:
 *     root
 *    /    \
 *   A      B
 *  / \    /
 * A1 A2  B1
 */
type N = 'root' | 'A' | 'A1' | 'A2' | 'B' | 'B1';
const TREE: KjTreeShape<N> = {
  getParent: (n) => ({ A: 'root', B: 'root', A1: 'A', A2: 'A', B1: 'B', root: null } as Record<N, N | null>)[n],
  getChildren: (n) => ({ root: ['A', 'B'] as N[], A: ['A1', 'A2'] as N[], B: ['B1'] as N[], A1: [] as N[], A2: [] as N[], B1: [] as N[] } as Record<N, readonly N[]>)[n],
  isLeaf: (n) => n === 'A1' || n === 'A2' || n === 'B1',
};

/**
 * An array that fails the test if anything walks it linearly. Handing one
 * of these to the model is how the membership specs below prove the O(1)
 * index really answered, rather than a scan that happened to be fast.
 */
function noScanArray<T>(values: readonly T[]): T[] {
  const arr = [...values];
  for (const method of ['some', 'findIndex', 'find', 'includes', 'filter'] as const) {
    Object.defineProperty(arr, method, {
      value: () => {
        throw new Error(`KjSelectionModel scanned the selection array via .${method}()`);
      },
      configurable: true,
    });
  }
  return arr;
}

/** Minimal `KjListItem` stand-in — the auto-shape only reads `value()` + `parent`. */
function fakeItem<T>(value: T, parent: KjListItem<unknown> | null = null): KjListItem<unknown> {
  return { value: () => value, parent } as unknown as KjListItem<unknown>;
}

describe('KjSelectionModel', () => {
  it('defaults to single mode with null value', () => {
    const { m, value } = setup<string>();
    expect(m.mode()).toBe('single');
    expect(value()).toBeNull();
  });

  it('isSelected uses Object.is by default', () => {
    const { m } = setup<string>();
    m.setValue('a');
    expect(m.isSelected('a')).toBe(true);
    expect(m.isSelected('b')).toBe(false);
  });

  it('toggle in single mode replaces value and returns closeRequested=true', () => {
    const { m, value } = setup<string>();
    const r = m.toggle('a');
    expect(value()).toBe('a');
    expect(r.closeRequested).toBe(true);
  });

  it('toggle in multi mode adds/removes and returns closeRequested=false', () => {
    const { m, value } = setup<string>();
    m.setMode('multi');
    m.toggle('a');
    m.toggle('b');
    expect(value()).toEqual(['a', 'b']);

    const r = m.toggle('a');
    expect(value()).toEqual(['b']);
    expect(r.closeRequested).toBe(false);
  });

  it('clear in single mode sets null, in multi mode sets []', () => {
    const { m, value } = setup<string>();
    m.setValue('a');
    m.clear();
    expect(value()).toBeNull();

    m.setMode('multi');
    m.setValue(['a', 'b']);
    m.clear();
    expect(value()).toEqual([]);
  });

  it('compareBy custom fn — by id field', () => {
    type Item = { id: string; label: string };
    const { m } = setup<Item>();
    m.setCompareBy((a, b) => a.id === b.id);
    m.setValue({ id: 'fr', label: 'France' });
    expect(m.isSelected({ id: 'fr', label: 'France (canonical)' })).toBe(true);
    expect(m.isSelected({ id: 'de', label: 'Germany' })).toBe(false);
  });

  it('isSelected returns false when value is null', () => {
    const { m } = setup<string>();
    expect(m.isSelected('a')).toBe(false);
  });

  describe('leaf mode', () => {
    it('toggle on a leaf adds it to the value array', () => {
      const { m, value } = setup<N>();
      m.setMode('leaf');
      m.setTreeShape(TREE);
      m.toggle('A1');
      m.toggle('B1');
      expect(value()).toEqual(['A1', 'B1']);
    });

    it('toggle on a branch is a no-op', () => {
      const { m, value } = setup<N>();
      m.setMode('leaf');
      m.setTreeShape(TREE);
      m.setValue([]);
      m.toggle('A');
      expect(value()).toEqual([]);
    });

    it('falls back to multi behavior when no tree shape is set', () => {
      const { m, value } = setup<N>();
      m.setMode('leaf');
      m.toggle('A'); // would be no-op with shape, but no shape → multi toggle
      expect(value()).toEqual(['A']);
    });
  });

  describe('cascade mode', () => {
    it('cascadeState of an unselected leaf is "false"', () => {
      const { m } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      expect(m.cascadeState('A1')).toBe('false');
    });

    it('toggling a leaf adds only that leaf', () => {
      const { m, value } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      m.toggle('A1');
      expect(value()).toEqual(['A1']);
      expect(m.cascadeState('A1')).toBe('true');
    });

    it('parent state is "mixed" when some descendants are selected', () => {
      const { m } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      m.toggle('A1');
      expect(m.cascadeState('A')).toBe('mixed');
      expect(m.cascadeState('root')).toBe('mixed');
    });

    it('parent state is "true" when all leaf descendants are selected', () => {
      const { m } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      m.toggle('A1');
      m.toggle('A2');
      expect(m.cascadeState('A')).toBe('true');
    });

    it('toggling a branch cascades to all leaf descendants', () => {
      const { m, value } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      m.toggle('A');
      expect([...(value() as N[])].sort()).toEqual(['A1', 'A2']);
      expect(m.cascadeState('A')).toBe('true');
    });

    it('toggling root selects every leaf in the tree', () => {
      const { m, value } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      m.toggle('root');
      expect([...(value() as N[])].sort()).toEqual(['A1', 'A2', 'B1']);
      expect(m.cascadeState('root')).toBe('true');
      expect(m.cascadeState('A')).toBe('true');
      expect(m.cascadeState('B')).toBe('true');
    });

    it('toggling a fully-selected branch deselects all its leaves', () => {
      const { m, value } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      m.toggle('A'); // selects A1, A2
      m.toggle('A'); // deselects them
      expect(value()).toEqual([]);
      expect(m.cascadeState('A')).toBe('false');
    });

    it('toggling a mixed branch fully selects all its leaves', () => {
      const { m, value } = setup<N>();
      m.setMode('cascade');
      m.setTreeShape(TREE);
      m.toggle('A1');               // A is now mixed
      expect(m.cascadeState('A')).toBe('mixed');
      m.toggle('A');                // mixed → true: should select A2 too
      expect([...(value() as N[])].sort()).toEqual(['A1', 'A2']);
      expect(m.cascadeState('A')).toBe('true');
    });

    it('cascade mode falls back to multi when no tree shape is set', () => {
      const { m, value } = setup<N>();
      m.setMode('cascade');
      m.toggle('A');
      expect(value()).toEqual(['A']);
    });
  });
  describe('membership index (perf F-6)', () => {
    it('answers multi-mode membership without scanning the selection array', () => {
      const { m, value } = setup<string>();
      m.setMode('multi');
      value.set(noScanArray(['a', 'b', 'c']));
      expect(m.isSelected('b')).toBe(true);
      expect(m.isSelected('zz')).toBe(false);
    });

    it.each(['leaf', 'cascade'] as const)(
      'answers %s-mode membership from the same index',
      mode => {
        const { m, value } = setup<string>();
        m.setMode(mode);
        value.set(noScanArray(['a', 'b']));
        expect(m.isSelected('a')).toBe(true);
        expect(m.isSelected('c')).toBe(false);
      },
    );

    it('rebuilds the index when the value changes', () => {
      const { m, value } = setup<string>();
      m.setMode('multi');
      value.set(noScanArray(['a']));
      expect(m.isSelected('b')).toBe(false);
      value.set(noScanArray(['a', 'b']));
      expect(m.isSelected('b')).toBe(true);
      value.set(noScanArray([]));
      expect(m.isSelected('a')).toBe(false);
    });

    it('checks membership for 5 000 rendered items without one comparator call', () => {
      const compare = vi.fn<KjCompareFn<number>>((a, b) => Object.is(a, b));
      const { m, value } = setup<number>();
      m.setMode('multi');
      // The default identity comparator keeps the indexed path; the spy
      // stands in for "a comparator ran", which the fast path must avoid.
      m.setCompareBy(Object.is as KjCompareFn<number>);
      value.set(noScanArray(Array.from({ length: 5000 }, (_, i) => i)));
      // What one render pass does: a membership check per rendered item.
      for (let i = 0; i < 5000; i++) expect(m.isSelected(i)).toBe(true);
      expect(m.isSelected(5000)).toBe(false);
      expect(compare).not.toHaveBeenCalled();
    });

    it('falls back to the linear scan for a custom comparator', () => {
      type Item = { id: string };
      const compare = vi.fn<KjCompareFn<Item>>((a, b) => a.id === b.id);
      const { m, value } = setup<Item>();
      m.setMode('multi');
      m.setCompareBy(compare);
      value.set([{ id: 'a' }, { id: 'b' }]);
      expect(m.isSelected({ id: 'b' })).toBe(true);
      expect(compare).toHaveBeenCalled();
    });

    it('keeps Object.is semantics for -0 rather than the Set SameValueZero', () => {
      const { m, value } = setup<number>();
      m.setMode('multi');
      value.set([0]);
      // Object.is(-0, 0) is false — the indexed path must not answer true.
      expect(m.isSelected(-0)).toBe(false);
      expect(m.isSelected(0)).toBe(true);
      value.set([-0]);
      expect(m.isSelected(0)).toBe(false);
      expect(m.isSelected(-0)).toBe(true);
    });

    it('multi toggle keeps array order and identity semantics at scale', () => {
      const { m, value } = setup<number>();
      m.setMode('multi');
      value.set(Array.from({ length: 2000 }, (_, i) => i));
      m.toggle(1000);
      const after = value() as readonly number[];
      expect(after).toHaveLength(1999);
      expect(after.indexOf(1000)).toBe(-1);
      expect(after[999]).toBe(999);
      expect(after[1000]).toBe(1001);
      m.toggle(1000);
      expect((value() as readonly number[])[1999]).toBe(1000);
    });
  });

  describe('auto-derived tree shape (perf F-7)', () => {
    /** root -> A -> A1 / A2, mirroring a DOM-nested cascade cluster. */
    function autoShapeSetup(compare?: KjCompareFn<string>) {
      const { m } = setup<string>();
      const root = fakeItem('root');
      const a = fakeItem('A', root);
      const a1 = fakeItem('A1', a);
      const a2 = fakeItem('A2', a);
      m.bind({ items: signal([root, a, a1, a2]) });
      // Settle the bind effects FIRST: the comparator effect re-reads the
      // bound source, so an imperative `setCompareBy` before it would be
      // overwritten on the next tick.
      TestBed.tick();
      if (compare) m.setCompareBy(compare);
      return m;
    }

    it('derives parent / children / leaf from the item parent chain', () => {
      const m = autoShapeSetup();
      const shape = m.shape()!;
      expect(shape).not.toBeNull();
      expect(shape.getParent('A1')).toBe('A');
      expect(shape.getChildren('A')).toEqual(['A1', 'A2']);
      expect(shape.isLeaf('A1')).toBe(true);
      expect(shape.isLeaf('A')).toBe(false);
    });

    it('resolves a known node without running the comparator once per key', () => {
      const compare = vi.fn<KjCompareFn<string>>((a, b) => a === b);
      const m = autoShapeSetup(compare);
      const shape = m.shape()!;
      compare.mockClear();
      expect(shape.isLeaf('A1')).toBe(true);
      expect(shape.getChildren('A')).toEqual(['A1', 'A2']);
      expect(shape.getParent('A')).toBe('root');
      expect(compare).not.toHaveBeenCalled();
    });

    it('still scans with a custom comparator when the key probe misses', () => {
      const compare = vi.fn<KjCompareFn<string>>((a, b) => a.toLowerCase() === b.toLowerCase());
      const m = autoShapeSetup(compare);
      const shape = m.shape()!;
      compare.mockClear();
      expect(shape.getChildren('a')).toEqual(['A1', 'A2']);
      expect(compare).toHaveBeenCalled();
    });

    it('walks each branch at most once per value version when several items ask', () => {
      const { m } = setup<N>();
      m.setMode('cascade');
      const getChildren = vi.fn(TREE.getChildren);
      const isLeaf = vi.fn(TREE.isLeaf);
      m.setTreeShape({ getParent: TREE.getParent, getChildren, isLeaf });

      // One render pass: every rendered item asks for its own tri-state.
      const states = (['root', 'A', 'A1', 'A2', 'B', 'B1'] as N[]).map(n => m.cascadeState(n));
      expect(states).toEqual(['false', 'false', 'false', 'false', 'false', 'false']);
      // Without the memo `root` re-walks A and B for every sibling that asks.
      expect(getChildren.mock.calls.filter(c => c[0] === 'A')).toHaveLength(1);
      expect(getChildren.mock.calls.filter(c => c[0] === 'root')).toHaveLength(1);

      // A new value version invalidates the memo and re-reports correctly.
      getChildren.mockClear();
      m.toggle('A1');
      expect(m.cascadeState('A')).toBe('mixed');
      expect(m.cascadeState('root')).toBe('mixed');
      expect(getChildren).toHaveBeenCalled();
    });
  });
});
