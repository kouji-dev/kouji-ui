/**
 * Row order of a virtualized body: what sits at each virtual index.
 *
 * In infinite mode the top-level rows stay index-aligned with the server
 * result set (`total` slots, holes for rows not loaded yet) and the children
 * of expanded parents are inserted right after their parent, so the virtual
 * list is longer than the result set. {@link topOf} / {@link indexOfTop}
 * translate between the two index spaces.
 */
export interface KjVirtualLayout<R> {
  /** Number of virtual rows. */
  readonly count: number;
  /** Whether empty slots are rows still loading (rendered as skeletons). */
  readonly sparse: boolean;
  /** Row at a virtual index; `undefined` for a row not loaded yet. */
  at(index: number): R | undefined;
  /** Top-level (result-set) index of the row at a virtual index — a child maps to its parent. */
  topOf(index: number): number;
  /** Virtual index of a top-level (result-set) row. */
  indexOfTop(top: number): number;
}

/** The minimal row shape the layout needs (a TanStack `Row`). */
export interface KjLayoutRow {
  readonly depth: number;
  readonly index: number;
}

/** Layout of a plain (already flattened) row list: virtual index = row position. */
export function listLayout<R>(rows: readonly R[]): KjVirtualLayout<R> {
  return {
    count: rows.length,
    sparse: false,
    at: (i) => rows[i],
    topOf: (i) => i,
    indexOfTop: (top) => top,
  };
}

/** Children of one expanded top-level row, inserted after it. */
interface Insert<R> {
  readonly top: number;
  readonly rows: R[];
  /** Children inserted before this parent. */
  before: number;
}

/**
 * Layout of an infinite body.
 * @param rows Flattened rows in result-set order (parents followed by their visible descendants).
 * @param total Size of the server result set (top-level rows).
 * @param sourceIndex Result-set index of each loaded top-level row, by `row.index`.
 */
export function infiniteLayout<R extends KjLayoutRow>(
  rows: readonly R[],
  total: number,
  sourceIndex: readonly number[] | null,
): KjVirtualLayout<R> {
  const count = Math.max(0, total);
  const slots = new Array<R | undefined>(count);
  const inserts: Insert<R>[] = [];
  let parentTop = -1;
  let current: Insert<R> | null = null;
  for (const r of rows) {
    if (r.depth === 0) {
      const top = sourceIndex?.[r.index] ?? r.index;
      parentTop = top < count ? top : -1;
      current = null;
      if (parentTop >= 0) slots[parentTop] = r;
      continue;
    }
    if (parentTop < 0) continue;
    if (!current) {
      current = { top: parentTop, rows: [], before: 0 };
      inserts.push(current);
    }
    current.rows.push(r);
  }

  if (inserts.length === 0) {
    return {
      count,
      sparse: true,
      at: (i) => slots[i],
      topOf: (i) => i,
      indexOfTop: (top) => top,
    };
  }

  inserts.sort((a, b) => a.top - b.top);
  let inserted = 0;
  for (const ins of inserts) {
    ins.before = inserted;
    inserted += ins.rows.length;
  }

  /** Last insert whose parent sits strictly before virtual index `v`, or -1. */
  const insertBefore = (v: number): number => {
    let lo = 0;
    let hi = inserts.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const ins = inserts[mid]!;
      if (ins.top + ins.before < v) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  };

  /** Resolves a virtual index to a child row of an insert, or to a top-level index. */
  const resolve = (v: number): { child: R; top: number } | { child: null; top: number } => {
    const k = insertBefore(v);
    if (k < 0) return { child: null, top: v };
    const ins = inserts[k]!;
    const offset = v - (ins.top + ins.before);
    if (offset <= ins.rows.length) return { child: ins.rows[offset - 1]!, top: ins.top };
    return { child: null, top: v - ins.before - ins.rows.length };
  };

  return {
    count: count + inserted,
    sparse: true,
    at: (i) => {
      const hit = resolve(i);
      return hit.child ?? slots[hit.top];
    },
    topOf: (i) => resolve(i).top,
    indexOfTop: (top) => {
      let lo = 0;
      let hi = inserts.length;
      // First insert whose parent is at or after `top`.
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (inserts[mid]!.top < top) lo = mid + 1;
        else hi = mid;
      }
      const ins = inserts[lo];
      return top + (ins ? ins.before : inserted);
    },
  };
}
