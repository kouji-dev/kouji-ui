import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { render } from '@testing-library/angular';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { kjColumn } from '@kouji-ui/core';
import { KjTableComponent, type KjSelectAllEvent } from './table';
import { KjTableLoadingTemplate } from './table-state-templates';
import { kjTableInfiniteResource, type KjTableInfinitePage } from './table-infinite-resource';
import type { KjTableRange } from './table-virtual';

// jsdom shims: no layout, no ResizeObserver, no Element.scrollTo. The scroll
// shim writes scrollTop and fires `scroll`, which is what the virtualizer
// listens to.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
// Specs share one jsdom per worker (`isolate: false`): put the prototype
// back afterwards so no other file inherits these layouts.
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
  // The scroll container is a 200px viewport over tall content; every row
  // measures 20px, matching the estimate.
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

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface Item {
  readonly id: string;
  readonly name: string;
}

const item = (i: number): Item => ({ id: `id-${i}`, name: `Row ${i}` });

/** Index-aligned window: rows at `loaded`, holes elsewhere. */
function sparse(total: number, loaded: number[]): (Item | undefined)[] {
  const out = new Array<Item | undefined>(total);
  for (const i of loaded) out[i] = item(i);
  return out;
}

const COLS = [
  kjColumn<Item>({ accessorKey: 'id', header: 'ID' }),
  kjColumn<Item>({ accessorKey: 'name', header: 'Name' }),
];

// ── Manual wiring: kjData + kjRowCount + (rangeChange) ─────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent, KjTableLoadingTemplate],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table
      [kjData]="$any(data())"
      [kjColumns]="cols"
      [kjGetRowId]="byId"
      [kjRowCount]="total()"
      [kjEstimatedRowSize]="20"
      [kjRangeChangeDebounce]="0"
      [kjLoading]="loading()"
      [kjLoadingMode]="mode()"
      kjSelectionMode="multi"
      [kjSelectAllMode]="selectAllMode()"
      (rangeChange)="ranges.push($event)"
      (selectAll)="selectAllEvents.push($event)"
    >
      <ng-template kjLoadingTemplate><span class="loader">Loading people</span></ng-template>
    </kj-table>
  `,
})
class ManualHost {
  readonly total = signal(100);
  readonly data = signal(sparse(100, [0, 1, 2, 3, 4, 8]));
  readonly loading = signal(false);
  readonly mode = signal<'bar' | 'overlay'>('bar');
  readonly selectAllMode = signal<'page' | 'loaded' | 'external'>('page');
  readonly ranges: KjTableRange[] = [];
  readonly selectAllEvents: KjSelectAllEvent[] = [];
  readonly cols = COLS;
  readonly byId = (row: Item): string => row.id;
  readonly table = viewChild.required(KjTableComponent);
}

async function renderManual() {
  const r = await render(ManualHost);
  await r.fixture.whenStable();
  r.fixture.detectChanges();
  return r;
}

describe('kj-table — server-side infinite mode (kjRowCount)', () => {
  it('spans the whole result set and renders unloaded rows as skeletons', async () => {
    const { container } = await renderManual();
    const grid = container.querySelector('[role="grid"]')!;
    expect(grid.getAttribute('aria-rowcount')).toBe('101');

    const rows = Array.from(container.querySelectorAll<HTMLElement>('tbody > tr[role="row"]'));
    const loaded = rows.filter((r) => !r.classList.contains('kj-table-skeleton-row'));
    const skeletons = rows.filter((r) => r.classList.contains('kj-table-skeleton-row'));
    expect(loaded.map((r) => r.textContent!.replace(/\s+/g, ''))).toContain('id-8Row8');
    expect(skeletons.length).toBeGreaterThan(0);

    // Row 8 sits at its result-set position: rows 5..7 are skeletons before it.
    const eight = loaded.find((r) => r.textContent?.includes('id-8'))!;
    expect(eight.getAttribute('aria-rowindex')).toBe('10');
    const five = skeletons.find((r) => r.getAttribute('aria-rowindex') === '7')!;
    expect(five.getAttribute('aria-busy')).toBe('true');
    expect(five.style.height).toBe('20px');
    expect(five.querySelectorAll('kj-skeleton').length).toBe(2);
  });

  it('fills a skeleton row in place once its row arrives', async () => {
    const { container, fixture } = await renderManual();
    fixture.componentInstance.data.set(sparse(100, [0, 1, 2, 3, 4, 5, 8]));
    fixture.detectChanges();
    const five = container.querySelector('tbody > tr[aria-rowindex="7"]')!;
    expect(five.classList.contains('kj-table-skeleton-row')).toBe(false);
    expect(five.textContent).toContain('Row 5');
  });

  it('emits (rangeChange) for the rows in view and again after a scroll', async () => {
    const { container, fixture } = await renderManual();
    await wait(0);
    const host = fixture.componentInstance;
    expect(host.ranges.at(-1)?.startIndex).toBe(0);

    const body = container.querySelector<HTMLElement>('.kj-table-body')!;
    body.scrollTo({ top: 50 * 20 });
    await fixture.whenStable();
    fixture.detectChanges();
    await wait(0);
    expect(host.ranges.at(-1)!.startIndex).toBe(50);
  });

  it('scroll API: restoreScroll / scrollOffset / scrollToIndex / scrollToTop', async () => {
    const { container, fixture } = await renderManual();
    const table = fixture.componentInstance.table();
    const body = container.querySelector<HTMLElement>('.kj-table-body')!;

    table.restoreScroll(360);
    expect(body.scrollTop).toBe(360);
    expect(table.scrollOffset()).toBe(360);

    table.scrollToIndex(40);
    expect(body.scrollTop).toBe(40 * 20);

    table.scrollToTop();
    expect(body.scrollTop).toBe(0);
    expect(table.scrollOffset()).toBe(0);
  });

  it('kjLoadingMode="overlay" centres the loading template over the rows', async () => {
    const { container, fixture } = await renderManual();
    const host = fixture.componentInstance;
    host.loading.set(true);
    fixture.detectChanges();
    let pane = container.querySelector('.kj-table-loading')!;
    expect(pane.hasAttribute('data-has-rows')).toBe(true); // 'bar' default: slim stripe

    host.mode.set('overlay');
    fixture.detectChanges();
    pane = container.querySelector('.kj-table-loading')!;
    expect(pane.getAttribute('data-mode')).toBe('overlay');
    expect(pane.hasAttribute('data-has-rows')).toBe(false);
    expect(pane.querySelector('.loader')?.textContent).toBe('Loading people');
    // The rows stay rendered underneath.
    expect(container.querySelector('tbody > tr[aria-rowindex="2"]')).toBeTruthy();
  });

  it('header checkbox: default mode selects the loaded rows and emits (selectAll)', async () => {
    const { container, fixture } = await renderManual();
    const header = container.querySelector<HTMLElement>('thead [role="checkbox"]')!;
    header.click();
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(host.selectAllEvents).toEqual([{ checked: true }]);
    expect(host.table().tableRef().state.rowSelection()).toEqual({
      'id-0': true,
      'id-1': true,
      'id-2': true,
      'id-3': true,
      'id-4': true,
      'id-8': true,
    });
  });

  it('header checkbox: external mode only emits — the consumer decides', async () => {
    const { container, fixture } = await renderManual();
    const host = fixture.componentInstance;
    host.selectAllMode.set('external');
    fixture.detectChanges();
    container.querySelector<HTMLElement>('thead [role="checkbox"]')!.click();
    fixture.detectChanges();
    expect(host.selectAllEvents).toEqual([{ checked: true }]);
    expect(host.table().tableRef().state.rowSelection()).toEqual({});
  });

  it('leaves sorting to the server: a header click changes state, not row order', async () => {
    const { container, fixture } = await renderManual();
    const host = fixture.componentInstance;
    host
      .table()
      .tableRef()
      .setState({ sorting: [{ id: 'name', desc: true }] });
    fixture.detectChanges();
    const first = container.querySelector('tbody > tr[role="row"]')!;
    expect(first.getAttribute('aria-rowindex')).toBe('2');
    expect(first.textContent).toContain('Row 0');
  });
});

// ── kjInfinite: the resource drives the table ──────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent, KjTableLoadingTemplate],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table
      [kjColumns]="cols"
      [kjGetRowId]="byId"
      [kjInfinite]="people"
      [kjEstimatedRowSize]="20"
      [kjRangeChangeDebounce]="0"
      kjLoadingMode="overlay"
    >
      <ng-template kjLoadingTemplate><span class="loader">Loading</span></ng-template>
    </kj-table>
  `,
})
class ResourceHost {
  readonly search = signal('');
  readonly calls: {
    offset: number;
    search: string;
    settle: (p: KjTableInfinitePage<Item>) => void;
  }[] = [];
  readonly people = kjTableInfiniteResource<Item, string>({
    request: () => this.search(),
    pageSize: 10,
    overscanPages: 0,
    loader: ({ request, offset }) =>
      new Promise((resolve) => this.calls.push({ offset, search: request, settle: resolve })),
  });
  readonly cols = COLS;
  readonly byId = (row: Item): string => row.id;
  readonly table = viewChild.required(KjTableComponent);

  /** Answer every pending call from a `total`-row result set. */
  answer(total: number): void {
    for (const c of this.calls.splice(0)) {
      const rows: Item[] = [];
      for (let i = c.offset; i < Math.min(c.offset + 10, total); i++) rows.push(item(i));
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

describe('kj-table — [kjInfinite]', () => {
  it('loads the first page, then the pages a scroll reveals', async () => {
    const { container, fixture } = await render(ResourceHost);
    const host = fixture.componentInstance;
    await settle(fixture);
    expect(host.calls.map((c) => c.offset)).toEqual([0]);
    expect(container.querySelector('.kj-table-loading')?.textContent).toContain('Loading');

    host.answer(1000);
    await settle(fixture);
    expect(container.querySelector('.kj-table-loading')).toBeNull();
    expect(container.querySelector('[role="grid"]')!.getAttribute('aria-rowcount')).toBe('1001');
    expect(container.querySelector('tbody > tr[aria-rowindex="2"]')!.textContent).toContain(
      'Row 0',
    );

    container.querySelector<HTMLElement>('.kj-table-body')!.scrollTo({ top: 500 * 20 });
    await settle(fixture);
    expect(host.calls.map((c) => c.offset)).toContain(500);
    expect(container.querySelector('tbody > tr[aria-rowindex="502"]')!.classList).toContain(
      'kj-table-skeleton-row',
    );

    host.answer(1000);
    await settle(fixture);
    expect(container.querySelector('tbody > tr[aria-rowindex="502"]')!.textContent).toContain(
      'Row 500',
    );
  });

  it('a request change dims the rows under the overlay, then resets to the top', async () => {
    const { container, fixture } = await render(ResourceHost);
    const host = fixture.componentInstance;
    await settle(fixture);
    host.answer(1000);
    await settle(fixture);
    const table = host.table();
    table.restoreScroll(300 * 20);
    await settle(fixture);
    host.answer(1000);
    await settle(fixture);

    host.search.set('x');
    await settle(fixture);
    const pane = container.querySelector('.kj-table-loading')!;
    expect(pane.getAttribute('data-mode')).toBe('overlay');
    expect(pane.hasAttribute('data-has-rows')).toBe(false);
    expect(
      container.querySelector('tbody > tr[role="row"]:not(.kj-table-skeleton-row)'),
    ).toBeTruthy();

    const reset = host.calls.find((c) => c.search === 'x')!;
    expect(reset.offset).toBe(0);
    host.answer(40);
    await settle(fixture);
    expect(container.querySelector('.kj-table-loading')).toBeNull();
    expect(table.scrollOffset()).toBe(0);
    expect(container.querySelector('[role="grid"]')!.getAttribute('aria-rowcount')).toBe('41');
  });

  it('a silent reload keeps the rows and the scroll position', async () => {
    const { container, fixture } = await render(ResourceHost);
    const host = fixture.componentInstance;
    await settle(fixture);
    host.answer(1000);
    await settle(fixture);
    const table = host.table();
    table.restoreScroll(200 * 20);
    await settle(fixture);
    host.answer(1000);
    await settle(fixture);

    host.people.reload({ silent: true });
    await settle(fixture);
    expect(container.querySelector('.kj-table-loading')).toBeNull();
    expect(host.calls.length).toBeGreaterThan(0);
    expect(host.calls.every((c) => c.offset >= 190 && c.offset <= 210)).toBe(true);
    expect(container.querySelector('tbody > tr[aria-rowindex="202"]')!.textContent).toContain(
      'Row 200',
    );

    host.answer(1000);
    await settle(fixture);
    expect(table.scrollOffset()).toBe(200 * 20);
    expect(container.querySelector<HTMLElement>('.kj-table-body')!.scrollTop).toBe(200 * 20);
  });
});
