import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent, type KjExpandedChangeEvent, type KjRowClickEvent } from './table';
import { kjTableInfiniteResource, type KjTableInfinitePage } from './table-infinite-resource';
import type { KjTableRange } from './table-virtual';

// jsdom shims (see table-infinite.spec.ts): a 200px viewport, 20px rows.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
const SHIMMED = [
  'offsetWidth',
  'offsetHeight',
  'clientHeight',
  'scrollHeight',
  'scrollTo',
] as const;
const saved = new Map<string, PropertyDescriptor | undefined>();
afterAll(() => {
  for (const key of SHIMMED) {
    const original = saved.get(key);
    if (original) Object.defineProperty(HTMLElement.prototype, key, original);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
  }
  vi.unstubAllGlobals();
});
beforeAll(() => {
  for (const key of SHIMMED)
    saved.set(key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key));
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 400,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('kj-table-body') ? 200 : 20;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 200,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => 1_000_000,
  });
  HTMLElement.prototype.scrollTo = function (this: HTMLElement, arg?: ScrollToOptions | number) {
    const top = typeof arg === 'object' ? arg.top : undefined;
    if (top !== undefined) this.scrollTop = top;
    this.dispatchEvent(new Event('scroll'));
  } as typeof HTMLElement.prototype.scrollTo;
});

expect.extend(toHaveNoViolations);

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface Item {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly Item[];
}

const TREE: Item[] = [
  {
    id: 'a',
    name: 'Alpha',
    children: [
      { id: 'a1', name: 'Alpha one' },
      { id: 'a2', name: 'Alpha two', children: [{ id: 'a2x', name: 'Alpha two x' }] },
    ],
  },
  { id: 'b', name: 'Bravo' },
  { id: 'c', name: 'Charlie', children: [{ id: 'c1', name: 'Charlie one' }] },
];

const COLS = [
  kjColumn<Item>({ accessorKey: 'name', header: 'Name' }),
  kjColumn<Item>({ accessorKey: 'id', header: 'ID' }),
];

const byId = (row: Item): string => row.id;
const children = (row: Item): readonly Item[] | undefined => row.children;

// ── Client-side tree ───────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table
      [kjData]="data()"
      [kjColumns]="cols"
      [kjGetRowId]="byId"
      [kjGetSubRows]="children"
      [kjDefaultExpanded]="open()"
      [kjSelectSubRows]="selectSub()"
      [kjSelectionMode]="mode()"
      [kjShowSelectionColumn]="column()"
      [kjVirtual]="virtual()"
      [kjEstimatedRowSize]="20"
      (expandedChange)="events.push($event)"
      (rowClick)="clicks.push($event)"
    />
  `,
})
class TreeHost {
  readonly data = signal<Item[]>(TREE);
  readonly open = signal(false);
  readonly selectSub = signal(false);
  readonly mode = signal<'none' | 'single' | 'multi'>('multi');
  readonly column = signal(true);
  readonly virtual = signal<boolean | 'auto'>(false);
  readonly events: KjExpandedChangeEvent<unknown>[] = [];
  readonly clicks: KjRowClickEvent<unknown>[] = [];
  readonly cols = COLS;
  readonly byId = byId;
  readonly children = children;
  readonly table = viewChild.required(KjTableComponent);
}

async function renderTree(init?: (h: TreeHost) => void) {
  const r = await render(TreeHost, { detectChangesOnRender: false });
  init?.(r.fixture.componentInstance);
  r.fixture.detectChanges();
  await r.fixture.whenStable();
  r.fixture.detectChanges();
  const host = r.fixture.componentInstance;
  const rows = (): HTMLElement[] =>
    Array.from(r.container.querySelectorAll<HTMLElement>('tbody > tr[role="row"]'));
  const rowOf = (id: string): HTMLElement =>
    rows().find((tr) => tr.querySelectorAll('td[role="gridcell"]')[1]?.textContent?.trim() === id)!;
  const toggleOf = (id: string): HTMLButtonElement =>
    rowOf(id).querySelector<HTMLButtonElement>('button.kj-table-tree-toggle')!;
  const update = (): void => r.fixture.detectChanges();
  return { ...r, host, rows, rowOf, toggleOf, update };
}

describe('kj-table — tree rows', () => {
  it('renders collapsed parents with a toggle (child count, aria-expanded) in the first data column', async () => {
    const { container, rows, rowOf, toggleOf } = await renderTree();
    expect(container.querySelector('table')!.getAttribute('role')).toBe('treegrid');
    expect(rows()).toHaveLength(3);

    const a = rowOf('a');
    const cells = a.querySelectorAll('td');
    // Selection column first, then the tree cell.
    expect(cells[0]!.classList).toContain('kj-table-select-cell');
    expect(cells[1]!.classList).toContain('kj-table-tree-cell');
    expect(cells[1]!.querySelector('button.kj-table-tree-toggle')).toBe(toggleOf('a'));
    expect(toggleOf('a').getAttribute('aria-expanded')).toBe('false');
    expect(toggleOf('a').getAttribute('aria-label')).toBe('2 child rows');
    expect(toggleOf('a').textContent).toContain('2');
    expect(a.getAttribute('data-depth')).toBe('0');
    expect(a.getAttribute('aria-level')).toBe('1');
    expect(a.getAttribute('aria-expanded')).toBe('false');

    // A leaf gets a spacer, no toggle, no aria-expanded.
    expect(toggleOf('b')).toBeNull();
    expect(rowOf('b').querySelector('.kj-table-tree-spacer')).toBeTruthy();
    expect(rowOf('b').hasAttribute('aria-expanded')).toBe(false);
  });

  it('a toggle click inserts the children as real rows — no selection, no (rowClick)', async () => {
    const { host, rows, rowOf, toggleOf, update } = await renderTree();
    toggleOf('a').click();
    update();
    expect(rows().map((tr) => tr.getAttribute('data-depth'))).toEqual(['0', '1', '1', '0', '0']);
    const a1 = rowOf('a1');
    expect(a1.querySelectorAll('td[role="gridcell"]')).toHaveLength(2);
    expect(a1.getAttribute('aria-level')).toBe('2');
    expect(
      a1
        .querySelector<HTMLElement>('td.kj-table-tree-cell')!
        .style.getPropertyValue('--kj-table-tree-depth'),
    ).toBe('1');
    expect(toggleOf('a').getAttribute('aria-expanded')).toBe('true');
    expect(rows().map((tr) => tr.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4', '5', '6']);

    expect(host.events).toEqual([{ row: TREE[0], rowId: 'a', expanded: true }]);
    expect(host.clicks).toHaveLength(0);
    expect(host.table().tableRef().state.rowSelection()).toEqual({});

    toggleOf('a').click();
    update();
    expect(rows()).toHaveLength(3);
    expect(host.events.at(-1)).toEqual({ row: TREE[0], rowId: 'a', expanded: false });
  });

  it('an expanded treegrid is axe-clean', async () => {
    // Selection off: the checkbox column's own labelling is out of scope here.
    const { container } = await renderTree((h) => {
      h.open.set(true);
      h.mode.set('none');
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('kjDefaultExpanded opens every parent; expandAll / collapseAll / isAllExpanded', async () => {
    const { host, rows, toggleOf, update } = await renderTree((h) => h.open.set(true));
    const table = host.table();
    expect(rows()).toHaveLength(7);
    expect(table.isAllExpanded()).toBe(true);

    toggleOf('a2').click();
    update();
    expect(rows()).toHaveLength(6);
    expect(table.isAllExpanded()).toBe(false);

    table.collapseAll();
    update();
    expect(rows()).toHaveLength(3);
    table.expandAll();
    update();
    expect(rows()).toHaveLength(7);
    expect(table.isAllExpanded()).toBe(true);
    expect(host.events.slice(-2)).toEqual([
      { row: null, rowId: null, expanded: false },
      { row: null, rowId: null, expanded: true },
    ]);
  });

  it('keyboard: ArrowRight / ArrowLeft on the tree cell, Enter on the cell, Enter / Space on the toggle', async () => {
    const { rows, rowOf, toggleOf, update } = await renderTree();
    const key = (el: HTMLElement, k: string): KeyboardEvent => {
      const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      update();
      return e;
    };
    const cell = (): HTMLElement => rowOf('a').querySelector<HTMLElement>('td.kj-table-tree-cell')!;

    expect(key(cell(), 'ArrowRight').defaultPrevented).toBe(true);
    expect(rows()).toHaveLength(5);
    // Already open: ArrowRight is left to grid navigation.
    key(cell(), 'ArrowRight');
    expect(rows()).toHaveLength(5);
    expect(key(cell(), 'ArrowLeft').defaultPrevented).toBe(true);
    expect(rows()).toHaveLength(3);
    // Not open: ArrowLeft is left to grid navigation.
    key(cell(), 'ArrowLeft');
    expect(rows()).toHaveLength(3);

    key(cell(), 'Enter');
    expect(rows()).toHaveLength(5);
    key(toggleOf('a'), 'Enter');
    expect(rows()).toHaveLength(3);
    key(toggleOf('a'), ' ');
    expect(rows()).toHaveLength(5);
    expect(toggleOf('a').getAttribute('tabindex')).toBe('-1');
  });

  it('children are selected on their own; kjSelectSubRows selects them with the parent', async () => {
    const { host, rowOf, toggleOf, update } = await renderTree();
    const table = host.table().tableRef();
    toggleOf('a').click();
    update();
    rowOf('a1').querySelector<HTMLElement>('[role="checkbox"]')!.click();
    update();
    expect(table.state.rowSelection()).toEqual({ a1: true });
    rowOf('a').querySelector<HTMLElement>('[role="checkbox"]')!.click();
    update();
    expect(table.state.rowSelection()).toEqual({ a1: true, a: true });

    table.setState({ rowSelection: {} });
    host.selectSub.set(true);
    update();
    rowOf('a').querySelector<HTMLElement>('[role="checkbox"]')!.click();
    update();
    expect(table.state.rowSelection()).toEqual({ a: true, a1: true, a2: true, a2x: true });
  });

  it('virtual mode: expanded children are windowed like any row', async () => {
    const { rows, toggleOf, update, container } = await renderTree((h) => h.virtual.set(true));
    expect(container.querySelector('tbody tr[data-index]')).toBeTruthy();
    toggleOf('c').click();
    update();
    await wait(0);
    update();
    expect(rows().map((tr) => tr.getAttribute('data-depth'))).toEqual(['0', '0', '0', '1']);
    expect(container.querySelector('table')!.getAttribute('aria-rowcount')).toBe('5');
  });
});

// ── Row click vs selection (fix) ───────────────────────────────────────────
describe('kj-table — row click with a selection column', () => {
  const plainRow = (rows: HTMLElement[], i: number): HTMLElement =>
    rows[i]!.querySelectorAll<HTMLElement>('td[role="gridcell"]')[1]!;

  it('multi: a row click only fires (rowClick) — the checkbox selects', async () => {
    const { host, rows, update } = await renderTree();
    plainRow(rows(), 1).click();
    update();
    expect(host.table().tableRef().state.rowSelection()).toEqual({});
    expect(host.clicks.map((c) => (c.row as Item).id)).toEqual(['b']);
  });

  it('single: a row click does not select either', async () => {
    const { host, rows, update } = await renderTree((h) => h.mode.set('single'));
    plainRow(rows(), 1).click();
    update();
    expect(host.table().tableRef().state.rowSelection()).toEqual({});
    expect(host.clicks).toHaveLength(1);
  });

  it('without the selection column a row click still selects', async () => {
    const { host, rows, update } = await renderTree((h) => h.column.set(false));
    plainRow(rows(), 1).click();
    update();
    expect(host.table().tableRef().state.rowSelection()).toEqual({ b: true });
    expect(host.clicks).toHaveLength(1);
  });
});

// ── Infinite + tree ────────────────────────────────────────────────────────
interface Node {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly Node[];
}

/** Server row `i`: every even row has two children. */
const node = (i: number): Node => ({
  id: `n${i}`,
  name: `Row ${i}`,
  children:
    i % 2 === 0
      ? [
          { id: `n${i}.a`, name: `Row ${i} a` },
          { id: `n${i}.b`, name: `Row ${i} b` },
        ]
      : undefined,
});

@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table
      [kjColumns]="cols"
      [kjGetRowId]="byId"
      [kjGetSubRows]="kids"
      [kjDefaultExpanded]="open()"
      [kjInfinite]="people"
      [kjEstimatedRowSize]="20"
      [kjRangeChangeDebounce]="0"
      (rangeChange)="ranges.push($event)"
    />
  `,
})
class InfiniteTreeHost {
  readonly search = signal('');
  readonly open = signal(false);
  readonly ranges: KjTableRange[] = [];
  readonly calls: {
    offset: number;
    limit: number;
    settle: (p: KjTableInfinitePage<Node>) => void;
  }[] = [];
  readonly people = kjTableInfiniteResource<Node, string>({
    request: () => this.search(),
    pageSize: 10,
    overscanPages: 0,
    loader: ({ offset, limit }) =>
      new Promise((resolve) => this.calls.push({ offset, limit, settle: resolve })),
  });
  readonly cols = [
    kjColumn<Node>({ accessorKey: 'name', header: 'Name' }),
    kjColumn<Node>({ accessorKey: 'id', header: 'ID' }),
  ];
  readonly byId = (row: Node): string => row.id;
  readonly kids = (row: Node): readonly Node[] | undefined => row.children;
  readonly table = viewChild.required(KjTableComponent);

  answer(total: number): void {
    for (const c of this.calls.splice(0)) {
      const rows: Node[] = [];
      for (let i = c.offset; i < Math.min(c.offset + c.limit, total); i++) rows.push(node(i));
      c.settle({ rows, total });
    }
  }
}

async function settle(fixture: {
  whenStable(): Promise<unknown>;
  detectChanges(): void;
}): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await wait(0);
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

describe('kj-table — infinite tree', () => {
  async function setup(init?: (h: InfiniteTreeHost) => void) {
    const r = await render(InfiniteTreeHost, { detectChangesOnRender: false });
    init?.(r.fixture.componentInstance);
    r.fixture.detectChanges();
    const host = r.fixture.componentInstance;
    await settle(r.fixture);
    host.answer(1000);
    await settle(r.fixture);
    const rowAt = (ariaIndex: number): HTMLElement | null =>
      r.container.querySelector<HTMLElement>(`tbody > tr[aria-rowindex="${ariaIndex}"]`);
    const toggle = (id: string): HTMLButtonElement =>
      Array.from(r.container.querySelectorAll<HTMLElement>('tbody > tr[role="row"]'))
        .find((tr) => tr.querySelectorAll('td')[1]?.textContent?.trim() === id)!
        .querySelector<HTMLButtonElement>('button.kj-table-tree-toggle')!;
    const rowCount = (): string | null =>
      r.container.querySelector('table')!.getAttribute('aria-rowcount');
    return { ...r, host, rowAt, toggle, rowCount };
  }

  it('top-level rows stay index-aligned; expanding inserts the children and keeps the scroll', async () => {
    const { host, fixture, container, rowAt, toggle, rowCount } = await setup();
    expect(rowCount()).toBe('1001');
    // The loader pages top-level rows.
    expect(host.calls).toHaveLength(0);

    const table = host.table();
    table.restoreScroll(5 * 20);
    await settle(fixture);
    const before = container.querySelector<HTMLElement>('.kj-table-body')!.scrollTop;

    toggle('n4').click();
    await settle(fixture);
    expect(rowCount()).toBe('1003');
    expect(rowAt(7)!.textContent).toContain('Row 4 a');
    expect(rowAt(7)!.getAttribute('data-depth')).toBe('1');
    expect(rowAt(9)!.textContent).toContain('Row 5');
    expect(container.querySelector<HTMLElement>('.kj-table-body')!.scrollTop).toBe(before);
  });

  it('(rangeChange) and the loader see top-level indexes, children folded into their parent', async () => {
    const { host, fixture, toggle } = await setup();
    host.table().expandAll();
    await settle(fixture);
    // 10 loaded rows, 5 parents x 2 children: the first 10 virtual rows are top rows 0..3 + children.
    const last = host.ranges.at(-1)!;
    expect(last.startIndex).toBe(0);
    expect(last.endIndex).toBeLessThan(10);
    expect(toggle('n0').getAttribute('aria-expanded')).toBe('true');

    host.table().scrollToIndex(500);
    await settle(fixture);
    // Top-level 500 sits after 5 expanded parents' children (+10 virtual rows).
    expect(host.calls.map((c) => c.offset)).toContain(500);
    const range = host.ranges.at(-1)!;
    expect(range.startIndex).toBeGreaterThanOrEqual(490);
    expect(range.startIndex).toBeLessThanOrEqual(500);
  });

  it('a silent reload keeps the expansion; a request change re-applies kjDefaultExpanded', async () => {
    const { host, fixture, toggle, rowCount } = await setup((h) => h.open.set(true));
    expect(rowCount()).toBe('1011');
    toggle('n0').click();
    await settle(fixture);
    expect(rowCount()).toBe('1009');

    host.people.reload({ silent: true });
    await settle(fixture);
    host.answer(1000);
    await settle(fixture);
    expect(rowCount()).toBe('1009');
    expect(toggle('n0').getAttribute('aria-expanded')).toBe('false');

    host.search.set('x');
    await settle(fixture);
    host.answer(1000);
    await settle(fixture);
    expect(rowCount()).toBe('1011');
    expect(toggle('n0').getAttribute('aria-expanded')).toBe('true');
  });
});
