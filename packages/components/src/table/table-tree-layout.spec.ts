import { describe, expect, it } from 'vitest';
import { infiniteLayout, listLayout } from './table-tree-layout';

interface R {
  readonly id: string;
  readonly depth: number;
  readonly index: number;
}

const top = (id: string, index: number): R => ({ id, depth: 0, index });
const child = (id: string, index: number, depth = 1): R => ({ id, depth, index });

describe('listLayout', () => {
  it('is the row list as is', () => {
    const rows = [top('a', 0), top('b', 1)];
    const l = listLayout(rows);
    expect(l.count).toBe(2);
    expect(l.sparse).toBe(false);
    expect(l.at(1)).toBe(rows[1]);
    expect(l.topOf(1)).toBe(1);
    expect(l.indexOfTop(1)).toBe(1);
  });
});

describe('infiniteLayout', () => {
  it('without expanded rows: top-level rows at their result-set index, holes elsewhere', () => {
    const rows = [top('r2', 0), top('r3', 1)];
    const l = infiniteLayout(rows, 10, [2, 3]);
    expect(l.count).toBe(10);
    expect(l.sparse).toBe(true);
    expect(l.at(0)).toBeUndefined();
    expect(l.at(2)?.id).toBe('r2');
    expect(l.at(3)?.id).toBe('r3');
    expect(l.topOf(7)).toBe(7);
    expect(l.indexOfTop(7)).toBe(7);
  });

  it('inserts the children of expanded parents after them', () => {
    // Result set of 10; rows 2 and 5 loaded; 2 has two children (one nested), 5 has one.
    const rows = [
      top('r2', 0),
      child('r2.0', 0),
      child('r2.0.0', 0, 2),
      top('r5', 1),
      child('r5.0', 0),
    ];
    const l = infiniteLayout(rows, 10, [2, 5]);
    expect(l.count).toBe(13);
    const ids = Array.from({ length: l.count }, (_, i) => l.at(i)?.id ?? null);
    expect(ids).toEqual([
      null,
      null,
      'r2',
      'r2.0',
      'r2.0.0',
      null,
      null,
      'r5',
      'r5.0',
      null,
      null,
      null,
      null,
    ]);
    // Children map to their parent's result-set index; rows after shift back.
    expect([3, 4, 5, 7, 8, 9, 12].map((i) => l.topOf(i))).toEqual([2, 2, 3, 5, 5, 6, 9]);
    expect([0, 2, 3, 5, 6, 9].map((t) => l.indexOfTop(t))).toEqual([0, 2, 5, 7, 9, 12]);
  });

  it('drops rows past the result-set end', () => {
    const rows = [top('r9', 0), child('r9.0', 0)];
    const l = infiniteLayout(rows, 5, [9]);
    expect(l.count).toBe(5);
    expect(l.at(4)).toBeUndefined();
  });
});
