// packages/core/src/primitives/list/selection.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { KjSelectionModel } from './selection';
import { KJ_LIST_NAVIGATOR_CONFIG, type KjTreeShape } from './tokens';

/**
 * Provide an explicit `value` signal via the shared config token so the
 * model writes through it. Tests assert on this signal directly — same
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
  return { m: TestBed.inject(KjSelectionModel) as KjSelectionModel<T>, value };
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
});
