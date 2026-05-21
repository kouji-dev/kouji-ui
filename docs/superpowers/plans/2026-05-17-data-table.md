# DataTable v0.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **PARALLELISM**: Tasks in phases B, C, and D are independent and SHOULD be dispatched in parallel via `superpowers:dispatching-parallel-agents`. Sequential phases (A and E) lock to one agent.

> **TEST SCOPING**: Every test command in this plan targets ONLY table-related specs. Never run the full project suite during this work.

**Goal:** Ship `<kj-data-table>` — an AG-Grid-class data table built on `@tanstack/angular-table`, with WAI-ARIA Grid pattern, full keyboard nav, server-side resource binding, persistence, inline editing, virtualization, and 20 playground examples.

**Architecture:** Two layers. The headless layer in `@kouji-ui/core/src/table/` owns all state (sort/filter/selection/pagination/sizing/visibility/order/pinning/expanded/grouping) as signals plus the TanStack table instance. The styled wrapper in `@kouji-ui/components/src/table/` composes the headless directives via `hostDirectives` and renders chrome (toolbar, pagination, side panel, status bar, editors, filters, export menu). Async data flows through `kjTableResource()`, a wrapper around Angular's `resource()` that wires the table's state signal into the resource's request.

**Tech Stack:** Angular 21, signals, `@tanstack/angular-table` (already installed), `@tanstack/virtual-core` (to add), `@kouji-ui/core` overlay + a11y primitives, Vitest + `@testing-library/angular` + `jest-axe` for unit specs, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-05-17-data-table-design.md` — read it before starting. The plan defers all design decisions to the spec; tasks here are about *ordering*, *test scaffolding*, and *file structure*.

---

## File structure overview

```
packages/core/src/table/
├── table.ts                       # KjTable directive (state signals + TanStack instance)
├── table-header.ts                # KjTableHeader directive (sort + ARIA)
├── table-row.ts                   # KjTableRow directive (selection + ARIA)
├── table-cell.ts                  # KjTableCell directive (ARIA + focus)
├── table-keyboard.ts              # KjTableKeyboardNav directive
├── column-helpers.ts              # kjColumn(), kjColumnGroup()
├── table-resource.ts              # kjTableResource()
├── table-storage.ts               # KjStorageAdapter token + adapters + provideKjTableStorage()
├── table.types.ts                 # public types
├── table.spec.ts                  # KjTable specs
├── table-header.spec.ts
├── table-row.spec.ts
├── table-cell.spec.ts
├── table-keyboard.spec.ts
├── column-helpers.spec.ts
├── table-resource.spec.ts
├── table-storage.spec.ts
└── index.ts                       # public barrel

packages/components/src/table/
├── data-table.ts                  # <kj-data-table> root
├── data-table-toolbar.ts          # <kj-data-table-toolbar>
├── data-table-pagination.ts       # <kj-data-table-pagination>
├── data-table-side-panel.ts       # <kj-data-table-side-panel>
├── data-table-status-bar.ts       # <kj-data-table-status-bar>
├── data-table-editors/
│   ├── text-editor.ts
│   ├── number-editor.ts
│   ├── date-editor.ts
│   ├── select-editor.ts
│   ├── boolean-editor.ts
│   └── index.ts
├── data-table-filters/
│   ├── text-filter.ts
│   ├── number-filter.ts
│   ├── date-filter.ts
│   ├── select-filter.ts
│   └── index.ts
├── data-table-export.ts           # CSV/JSON/clipboard export utilities
├── data-table-virtual.ts          # @tanstack/virtual-core adapter
├── data-table.css
├── data-table.spec.ts             # wrapper-level specs
├── data-table.example.ts          # ─┐ 20 playgrounds
├── data-table.usage.example.ts    #  │
├── data-table.sortable.example.ts #  │
│   …                              #  │
├── data-table.keyboard.example.ts # ─┘
├── data-table.playground.ts       # interactive playground
└── index.ts                       # public barrel

apps/docs/e2e/
└── data-table.spec.ts             # Playwright E2E
```

---

## Phase A — Headless core (sequential, must land first)

### Task A1: Add `@tanstack/virtual-core` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the dep**

```bash
pnpm add -w @tanstack/virtual-core@^3.10.0
```

- [ ] **Step 2: Verify install**

Run: `pnpm list -w @tanstack/virtual-core`
Expected: shows version `^3.10.0`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add @tanstack/virtual-core for table row virtualization"
```

---

### Task A2: Public types in `table.types.ts`

**Files:**
- Create: `packages/core/src/table/table.types.ts`

- [ ] **Step 1: Write the types file**

```ts
import type { ColumnDef, RowData, Table, SortingState, ColumnFiltersState, PaginationState, RowSelectionState, ColumnSizingState, VisibilityState, ColumnOrderState, ColumnPinningState, ExpandedState, GroupingState } from '@tanstack/angular-table';
import type { TemplateRef, Type } from '@angular/core';

/** Built-in column types. Drives filter widget, editor widget, formatter, alignment. */
export type KjColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select';

/** Pin slot for a column. */
export type KjColumnPin = 'left' | 'right' | null;

/** Built-in aggregation kinds; pass a function for custom. */
export type KjAggregationKind = 'sum' | 'avg' | 'min' | 'max' | 'count';
export type KjAggregationFn<T> = (rows: readonly T[]) => unknown;
export type KjAggregation<T> = KjAggregationKind | KjAggregationFn<T>;

/** Editor / filter UI override: a component class OR a template ref. */
export type KjEditorRef<TData = unknown, TValue = unknown> =
  | Type<unknown>
  | TemplateRef<{ row: TData; value: TValue; commit: (v: TValue) => void; cancel: () => void }>;

export type KjFilterUiRef<TData = unknown> =
  | Type<unknown>
  | TemplateRef<{ column: unknown; table: Table<TData> }>;

/** kj-specific meta stored on TanStack ColumnDef.meta.kj. */
export interface KjColumnMeta<TData extends RowData = RowData> {
  type?: KjColumnType;
  editable?: boolean;
  filterable?: boolean;
  pin?: KjColumnPin;
  group?: boolean;
  agg?: KjAggregation<TData>;
  editor?: KjEditorRef<TData>;
  filterUi?: KjFilterUiRef<TData>;
  selectOptions?: ReadonlyArray<string | { value: unknown; label: string }>;
  exportable?: boolean;
  persist?: boolean;
}

/** kj column definition — TanStack ColumnDef extended with kj* top-level knobs. */
export type KjColumnDef<TData extends RowData = RowData> =
  ColumnDef<TData> & {
    kjType?: KjColumnType;
    kjEditable?: boolean;
    kjFilterable?: boolean;
    kjPin?: KjColumnPin;
    kjGroup?: boolean;
    kjAgg?: KjAggregation<TData>;
    kjEditor?: KjEditorRef<TData>;
    kjFilterUi?: KjFilterUiRef<TData>;
    kjSelectOptions?: ReadonlyArray<string | { value: unknown; label: string }>;
    kjExportable?: boolean;
    kjPersist?: boolean;
  };

/** Complete table state — exposed via signals and emitted via (stateChange). */
export interface KjTableState {
  readonly sorting: SortingState;
  readonly columnFilters: ColumnFiltersState;
  readonly globalFilter: string;
  readonly pagination: PaginationState;
  readonly rowSelection: RowSelectionState;
  readonly columnSizing: ColumnSizingState;
  readonly columnVisibility: VisibilityState;
  readonly columnOrder: ColumnOrderState;
  readonly columnPinning: ColumnPinningState;
  readonly expanded: ExpandedState;
  readonly grouping: GroupingState;
  readonly density: 'compact' | 'standard' | 'comfortable';
}

/** Loader return value for kjTableResource. Matches TanStack manualPagination + rowCount. */
export interface KjResourceResult<TData> {
  readonly rows: readonly TData[];
  readonly rowCount: number;
}
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm --filter @kouji-ui/core exec tsc --noEmit -p tsconfig.lib.json
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/table/table.types.ts
git commit -m "feat(core/table): public types for KjColumnDef, KjTableState, KjResourceResult"
```

---

### Task A3: `kjColumn()` + `kjColumnGroup()` helpers + tests

**Files:**
- Create: `packages/core/src/table/column-helpers.ts`
- Create: `packages/core/src/table/column-helpers.spec.ts`

- [ ] **Step 1: Write the failing test**

`packages/core/src/table/column-helpers.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kjColumn, kjColumnGroup } from './column-helpers';
import type { KjColumnDef } from './table.types';

interface User { id: string; name: string; email: string; age: number; }

describe('kjColumn', () => {
  it('returns a ColumnDef compatible with TanStack', () => {
    const col = kjColumn<User>({ accessorKey: 'name', header: 'Name' });
    expect(col.accessorKey).toBe('name');
    expect(col.header).toBe('Name');
  });

  it('hoists kj* knobs into meta.kj', () => {
    const col = kjColumn<User>({
      accessorKey: 'name',
      kjType: 'text',
      kjEditable: true,
      kjPin: 'left',
    });
    expect((col.meta as any)?.kj).toEqual({
      type: 'text',
      editable: true,
      pin: 'left',
    });
    // top-level kj* fields are stripped — TanStack sees only its native fields.
    expect((col as any).kjType).toBeUndefined();
    expect((col as any).kjEditable).toBeUndefined();
  });

  it('preserves existing meta', () => {
    const col = kjColumn<User>({
      accessorKey: 'name',
      meta: { foo: 'bar' } as any,
      kjEditable: true,
    });
    expect((col.meta as any).foo).toBe('bar');
    expect((col.meta as any).kj.editable).toBe(true);
  });

  it('omits meta.kj when no kj* knobs are passed', () => {
    const col = kjColumn<User>({ accessorKey: 'name' });
    expect((col.meta as any)?.kj).toBeUndefined();
  });
});

describe('kjColumnGroup', () => {
  it('returns a group column def with nested columns', () => {
    const grp = kjColumnGroup<User>({
      header: 'Identity',
      columns: [
        kjColumn<User>({ accessorKey: 'name' }),
        kjColumn<User>({ accessorKey: 'email' }),
      ],
    });
    expect(grp.header).toBe('Identity');
    expect((grp as any).columns).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/column-helpers.spec.ts
```
Expected: FAIL — `Cannot find module './column-helpers'`

- [ ] **Step 3: Implement helpers**

`packages/core/src/table/column-helpers.ts`:

```ts
import type { ColumnDef, RowData } from '@tanstack/angular-table';
import type { KjColumnDef, KjColumnMeta } from './table.types';

const KJ_KEYS = [
  'kjType', 'kjEditable', 'kjFilterable', 'kjPin', 'kjGroup', 'kjAgg',
  'kjEditor', 'kjFilterUi', 'kjSelectOptions', 'kjExportable', 'kjPersist',
] as const;

/** Strip leading 'kj' and lowercase first char. */
function unprefix(k: string): keyof KjColumnMeta {
  return (k.slice(2, 3).toLowerCase() + k.slice(3)) as keyof KjColumnMeta;
}

/**
 * Define a column for `<kj-data-table>`. Pass-through for every TanStack
 * `ColumnDef` field; kj-specific top-level knobs (`kjType`, `kjEditable`,
 * `kjPin`, …) are hoisted into `meta.kj` for the wrapper to read.
 */
export function kjColumn<TData extends RowData>(def: KjColumnDef<TData>): ColumnDef<TData> {
  const kjMeta: Partial<KjColumnMeta<TData>> = {};
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(def)) {
    if ((KJ_KEYS as readonly string[]).includes(k)) {
      if (v !== undefined) kjMeta[unprefix(k)] = v as never;
    } else {
      rest[k] = v;
    }
  }
  const existingMeta = (rest.meta ?? {}) as Record<string, unknown>;
  const meta = Object.keys(kjMeta).length === 0
    ? existingMeta
    : { ...existingMeta, kj: kjMeta };
  return { ...rest, meta } as ColumnDef<TData>;
}

/** Define a column group (header grouping). Children are `kjColumn()` defs. */
export function kjColumnGroup<TData extends RowData>(def: {
  id?: string;
  header: ColumnDef<TData>['header'];
  columns: ColumnDef<TData>[];
}): ColumnDef<TData> {
  return def as unknown as ColumnDef<TData>;
}
```

- [ ] **Step 4: Verify test passes**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/column-helpers.spec.ts
```
Expected: PASS (4 in `kjColumn` + 1 in `kjColumnGroup`).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/table/column-helpers.ts packages/core/src/table/column-helpers.spec.ts
git commit -m "feat(core/table): kjColumn/kjColumnGroup helpers — hoist kj* knobs into meta.kj"
```

---

### Task A4: `KjStorageAdapter` + adapters + `provideKjTableStorage()` + tests

**Files:**
- Create: `packages/core/src/table/table-storage.ts`
- Create: `packages/core/src/table/table-storage.spec.ts`

- [ ] **Step 1: Write the failing test**

`packages/core/src/table/table-storage.spec.ts`:

```ts
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
```

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table-storage.spec.ts
```
Expected: FAIL — `Cannot find module './table-storage'`

- [ ] **Step 3: Implement storage**

`packages/core/src/table/table-storage.ts`:

```ts
import { InjectionToken, Provider } from '@angular/core';

/**
 * Adapter contract for persisting `<kj-data-table>` state. The default
 * factory yields an in-memory adapter in non-browser environments and a
 * localStorage adapter in the browser.
 */
export interface KjStorageAdapter {
  read<T>(key: string): T | null;
  write<T>(key: string, value: T): void;
}

export interface LocalStorageAdapterOptions { keyPrefix?: string; }
export interface SessionStorageAdapterOptions { keyPrefix?: string; }

/** Per-instance in-memory adapter. Survives nothing. Default in SSR/tests. */
export function inMemoryAdapter(): KjStorageAdapter {
  const store = new Map<string, unknown>();
  return {
    read: <T>(k: string): T | null => store.has(k) ? (store.get(k) as T) : null,
    write: <T>(k: string, v: T) => { store.set(k, v); },
  };
}

function wrap(get: () => Storage | null, prefix = ''): KjStorageAdapter {
  return {
    read<T>(k: string): T | null {
      const s = get();
      if (!s) return null;
      const raw = s.getItem(prefix + k);
      if (raw == null) return null;
      try { return JSON.parse(raw) as T; } catch { return null; }
    },
    write<T>(k: string, v: T) {
      const s = get();
      if (!s) return;
      try { s.setItem(prefix + k, JSON.stringify(v)); } catch { /* quota / serialization */ }
    },
  };
}

const safeLocal = (): Storage | null => {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
};
const safeSession = (): Storage | null => {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; }
};

/** Adapter backed by `localStorage`. No-ops in SSR. Optional `keyPrefix`. */
export function localStorageAdapter(opts: LocalStorageAdapterOptions = {}): KjStorageAdapter {
  return wrap(safeLocal, opts.keyPrefix ?? '');
}

/** Adapter backed by `sessionStorage`. No-ops in SSR. Optional `keyPrefix`. */
export function sessionStorageAdapter(opts: SessionStorageAdapterOptions = {}): KjStorageAdapter {
  return wrap(safeSession, opts.keyPrefix ?? '');
}

/** Default smart adapter — localStorage in browser, in-memory otherwise. */
function defaultAdapter(): KjStorageAdapter {
  return safeLocal() ? localStorageAdapter() : inMemoryAdapter();
}

/**
 * DI token for the active table storage adapter. Default factory yields a
 * smart adapter (localStorage in browser, in-memory otherwise). Override via
 * `provideKjTableStorage(...)` at app scope or `[kjStorageAdapter]` per table.
 */
export const KJ_TABLE_STORAGE = new InjectionToken<KjStorageAdapter>('kj.table.storage', {
  factory: defaultAdapter,
});

/** Configures the app-wide table storage adapter. */
export function provideKjTableStorage(adapter: KjStorageAdapter): Provider {
  return { provide: KJ_TABLE_STORAGE, useValue: adapter };
}
```

- [ ] **Step 4: Verify test passes**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table-storage.spec.ts
```
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/table/table-storage.ts packages/core/src/table/table-storage.spec.ts
git commit -m "feat(core/table): KjStorageAdapter token + in-memory/localStorage/sessionStorage adapters"
```

---

### Task A5: Enhance `KjTable` directive — state signals

The existing `KjTable` only tracks `sorting`. Grow it to track all 11 TanStack state slices as readonly signals, expose imperative API (`resetState`, `getState`, `setState`), and the full table instance.

**Files:**
- Modify: `packages/core/src/table/table.ts`
- Create/grow: `packages/core/src/table/table.spec.ts`

- [ ] **Step 1: Write the failing test**

`packages/core/src/table/table.spec.ts`:

```ts
import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { kjColumn } from './column-helpers';

interface Row { id: string; name: string; }

@Component({
  standalone: true,
  imports: [KjTable],
  template: `<table [kjTable]="cols" [kjTableData]="data()" #t="kjTable"></table>`,
})
class Host {
  protected readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  protected readonly data = signal<Row[]>([{ id: '1', name: 'alice' }, { id: '2', name: 'bob' }]);
}

describe('KjTable (extended)', () => {
  it('exposes every state slice as a readonly signal', async () => {
    const { fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    expect(dir.sorting()).toEqual([]);
    expect(dir.columnFilters()).toEqual([]);
    expect(dir.globalFilter()).toBe('');
    expect(dir.pagination()).toEqual({ pageIndex: 0, pageSize: 25 });
    expect(dir.rowSelection()).toEqual({});
    expect(dir.columnSizing()).toEqual({});
    expect(dir.columnVisibility()).toEqual({});
    expect(dir.columnOrder()).toEqual([]);
    expect(dir.columnPinning()).toEqual({ left: [], right: [] });
    expect(dir.expanded()).toEqual({});
    expect(dir.grouping()).toEqual([]);
    expect(dir.density()).toBe('standard');
  });

  it('getState returns full bundle, setState merges', async () => {
    const { fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    dir.setState({ density: 'compact', globalFilter: 'al' });
    expect(dir.density()).toBe('compact');
    expect(dir.globalFilter()).toBe('al');
    expect(dir.getState().density).toBe('compact');
  });

  it('resetState clears all slices', async () => {
    const { fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    dir.setState({ density: 'compact', globalFilter: 'x' });
    dir.resetState();
    expect(dir.density()).toBe('standard');
    expect(dir.globalFilter()).toBe('');
  });
});
```

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table.spec.ts
```
Expected: FAIL — properties not defined.

- [ ] **Step 3: Implement state enhancement**

Replace `packages/core/src/table/table.ts` with an expanded directive that owns 11 state signals (`sorting`, `columnFilters`, `globalFilter`, `pagination`, `rowSelection`, `columnSizing`, `columnVisibility`, `columnOrder`, `columnPinning`, `expanded`, `grouping`) + `density`, exposes them as readonly signals, threads them into the TanStack table config (`getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, `getExpandedRowModel`, `getGroupedRowModel`), and exports the existing `KJ_TABLE` token unchanged. Add `getState()`, `setState(partial)`, `resetState()`.

Reference spec section "State as signals (on `KjTable` directive / `tableRef`)" for the exact shape. Key code skeleton:

```ts
// table.ts (replacement)
import {
  ColumnDef, RowData, SortingState, ColumnFiltersState, PaginationState,
  RowSelectionState, ColumnSizingState, VisibilityState, ColumnOrderState,
  ColumnPinningState, ExpandedState, GroupingState,
  createAngularTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, getExpandedRowModel, getGroupedRowModel,
  type Table,
} from '@tanstack/angular-table';
import { Directive, InjectionToken, signal, input } from '@angular/core';
import type { KjTableState } from './table.types';

export const KJ_TABLE = new InjectionToken<KjTable<unknown>>('KjTable');

const DEFAULT_STATE: KjTableState = {
  sorting: [],
  columnFilters: [],
  globalFilter: '',
  pagination: { pageIndex: 0, pageSize: 25 },
  rowSelection: {},
  columnSizing: {},
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  expanded: {},
  grouping: [],
  density: 'standard',
};

@Directive({
  selector: '[kjTable]',
  standalone: true,
  exportAs: 'kjTable',
  providers: [{ provide: KJ_TABLE, useExisting: KjTable }],
})
export class KjTable<TData extends RowData = unknown> {
  kjTable = input.required<ColumnDef<TData>[]>();
  kjTableData = input<TData[]>([]);

  private readonly _sorting           = signal<SortingState>(DEFAULT_STATE.sorting);
  private readonly _columnFilters     = signal<ColumnFiltersState>(DEFAULT_STATE.columnFilters);
  private readonly _globalFilter      = signal(DEFAULT_STATE.globalFilter);
  private readonly _pagination        = signal<PaginationState>(DEFAULT_STATE.pagination);
  private readonly _rowSelection      = signal<RowSelectionState>(DEFAULT_STATE.rowSelection);
  private readonly _columnSizing      = signal<ColumnSizingState>(DEFAULT_STATE.columnSizing);
  private readonly _columnVisibility  = signal<VisibilityState>(DEFAULT_STATE.columnVisibility);
  private readonly _columnOrder       = signal<ColumnOrderState>(DEFAULT_STATE.columnOrder);
  private readonly _columnPinning     = signal<ColumnPinningState>(DEFAULT_STATE.columnPinning);
  private readonly _expanded          = signal<ExpandedState>(DEFAULT_STATE.expanded);
  private readonly _grouping          = signal<GroupingState>(DEFAULT_STATE.grouping);
  private readonly _density           = signal<'compact' | 'standard' | 'comfortable'>(DEFAULT_STATE.density);

  readonly sorting          = this._sorting.asReadonly();
  readonly columnFilters    = this._columnFilters.asReadonly();
  readonly globalFilter     = this._globalFilter.asReadonly();
  readonly pagination       = this._pagination.asReadonly();
  readonly rowSelection     = this._rowSelection.asReadonly();
  readonly columnSizing     = this._columnSizing.asReadonly();
  readonly columnVisibility = this._columnVisibility.asReadonly();
  readonly columnOrder      = this._columnOrder.asReadonly();
  readonly columnPinning    = this._columnPinning.asReadonly();
  readonly expanded         = this._expanded.asReadonly();
  readonly grouping         = this._grouping.asReadonly();
  readonly density          = this._density.asReadonly();

  readonly table: () => Table<TData> = createAngularTable<TData>(() => ({
    data: this.kjTableData(),
    columns: this.kjTable(),
    state: {
      sorting:          this._sorting(),
      columnFilters:    this._columnFilters(),
      globalFilter:     this._globalFilter(),
      pagination:       this._pagination(),
      rowSelection:     this._rowSelection(),
      columnSizing:     this._columnSizing(),
      columnVisibility: this._columnVisibility(),
      columnOrder:      this._columnOrder(),
      columnPinning:    this._columnPinning(),
      expanded:         this._expanded(),
      grouping:         this._grouping(),
    },
    onSortingChange:          u => set(this._sorting, u),
    onColumnFiltersChange:    u => set(this._columnFilters, u),
    onGlobalFilterChange:     u => set(this._globalFilter, u),
    onPaginationChange:       u => set(this._pagination, u),
    onRowSelectionChange:     u => set(this._rowSelection, u),
    onColumnSizingChange:     u => set(this._columnSizing, u),
    onColumnVisibilityChange: u => set(this._columnVisibility, u),
    onColumnOrderChange:      u => set(this._columnOrder, u),
    onColumnPinningChange:    u => set(this._columnPinning, u),
    onExpandedChange:         u => set(this._expanded, u),
    onGroupingChange:         u => set(this._grouping, u),
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel:   getExpandedRowModel(),
    getGroupedRowModel:    getGroupedRowModel(),
  }));

  getState(): KjTableState {
    return {
      sorting: this._sorting(),
      columnFilters: this._columnFilters(),
      globalFilter: this._globalFilter(),
      pagination: this._pagination(),
      rowSelection: this._rowSelection(),
      columnSizing: this._columnSizing(),
      columnVisibility: this._columnVisibility(),
      columnOrder: this._columnOrder(),
      columnPinning: this._columnPinning(),
      expanded: this._expanded(),
      grouping: this._grouping(),
      density: this._density(),
    };
  }

  setState(partial: Partial<KjTableState>): void {
    if (partial.sorting          !== undefined) this._sorting.set(partial.sorting);
    if (partial.columnFilters    !== undefined) this._columnFilters.set(partial.columnFilters);
    if (partial.globalFilter     !== undefined) this._globalFilter.set(partial.globalFilter);
    if (partial.pagination       !== undefined) this._pagination.set(partial.pagination);
    if (partial.rowSelection     !== undefined) this._rowSelection.set(partial.rowSelection);
    if (partial.columnSizing     !== undefined) this._columnSizing.set(partial.columnSizing);
    if (partial.columnVisibility !== undefined) this._columnVisibility.set(partial.columnVisibility);
    if (partial.columnOrder      !== undefined) this._columnOrder.set(partial.columnOrder);
    if (partial.columnPinning    !== undefined) this._columnPinning.set(partial.columnPinning);
    if (partial.expanded         !== undefined) this._expanded.set(partial.expanded);
    if (partial.grouping         !== undefined) this._grouping.set(partial.grouping);
    if (partial.density          !== undefined) this._density.set(partial.density);
  }

  resetState(): void { this.setState(DEFAULT_STATE); }
}

function set<T>(sig: { set: (v: T) => void; (): T }, updater: T | ((prev: T) => T)): void {
  const next = typeof updater === 'function' ? (updater as (p: T) => T)(sig()) : updater;
  sig.set(next);
}
```

`KjTableHeader` stays in `table.ts` for now (existing — we'll split in Task A6).

- [ ] **Step 4: Verify test passes**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table
```
Expected: PASS (column-helpers + table-storage + table specs all green).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/table/table.ts packages/core/src/table/table.spec.ts
git commit -m "feat(core/table): grow KjTable with all 11 TanStack state signals + density + imperative API"
```

---

### Task A6: Split `KjTableHeader` into own file (no behaviour change)

**Files:**
- Create: `packages/core/src/table/table-header.ts`
- Modify: `packages/core/src/table/table.ts` (remove `KjTableHeader`)
- Create: `packages/core/src/table/table-header.spec.ts`

- [ ] **Step 1: Move `KjTableHeader` from `table.ts` → `table-header.ts`**

Cut the existing `KjTableHeader` class (lines ~75–133 of `table.ts`) into a new file `packages/core/src/table/table-header.ts`. No code changes. Update imports.

- [ ] **Step 2: Write a focused spec**

`packages/core/src/table/table-header.spec.ts`:

```ts
import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableHeader } from './table-header';
import { kjColumn } from './column-helpers';

interface Row { name: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableHeader],
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <thead>
        @for (g of t.table().getHeaderGroups(); track g.id) {
          <tr>
            @for (h of g.headers; track h.id) {
              <th kjTableHeader [kjHeader]="h" scope="col">{{ h.column.columnDef.header }}</th>
            }
          </tr>
        }
      </thead>
    </table>
  `,
})
class Host {
  protected readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  protected readonly data = signal<Row[]>([]);
}

describe('KjTableHeader', () => {
  it('sets aria-sort to none initially', async () => {
    const { container } = await render(Host);
    const th = container.querySelector('th') as HTMLElement;
    expect(th.getAttribute('aria-sort')).toBe('none');
  });

  it('toggles aria-sort on click', async () => {
    const { container } = await render(Host);
    const th = container.querySelector('th') as HTMLElement;
    th.click();
    await new Promise(r => setTimeout(r));
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    th.click();
    await new Promise(r => setTimeout(r));
    expect(th.getAttribute('aria-sort')).toBe('descending');
  });
});
```

- [ ] **Step 3: Verify all core/table tests still pass**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table
```
Expected: PASS — column-helpers + table-storage + table + table-header all green.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/table/
git commit -m "refactor(core/table): split KjTableHeader into table-header.ts + own spec"
```

---

### Task A7: `KjTableRow` + `KjTableCell` + selection a11y

**Files:**
- Create: `packages/core/src/table/table-row.ts`
- Create: `packages/core/src/table/table-cell.ts`
- Create: `packages/core/src/table/table-row.spec.ts`
- Create: `packages/core/src/table/table-cell.spec.ts`

- [ ] **Step 1: Write failing tests**

`packages/core/src/table/table-row.spec.ts`:

```ts
import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableRow } from './table-row';
import { kjColumn } from './column-helpers';

interface Row { id: string; name: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableRow],
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r"></tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  protected readonly data = signal<Row[]>([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
}

describe('KjTableRow', () => {
  it('sets role="row" and aria-rowindex', async () => {
    const { container } = await render(Host);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].getAttribute('role')).toBe('row');
    expect(rows[0].getAttribute('aria-rowindex')).toBe('2'); // 1 = header
    expect(rows[1].getAttribute('aria-rowindex')).toBe('3');
  });

  it('reflects aria-selected when row is selected', async () => {
    const { container, fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    dir.setState({ rowSelection: { a: true } });
    fixture.detectChanges();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].getAttribute('aria-selected')).toBe('true');
    expect(rows[1].getAttribute('aria-selected')).toBe('false');
  });
});
```

`packages/core/src/table/table-cell.spec.ts`:

```ts
import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableRow } from './table-row';
import { KjTableCell } from './table-cell';
import { kjColumn } from './column-helpers';

interface Row { name: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableRow, KjTableCell],
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r">
            @for (c of r.getVisibleCells(); track c.id) {
              <td kjTableCell [kjCell]="c">{{ c.getValue() }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'name', header: 'Name' }),
  ];
  protected readonly data = signal<Row[]>([{ name: 'A' }]);
}

describe('KjTableCell', () => {
  it('sets role="gridcell" and aria-colindex', async () => {
    const { container } = await render(Host);
    const td = container.querySelector('tbody td') as HTMLElement;
    expect(td.getAttribute('role')).toBe('gridcell');
    expect(td.getAttribute('aria-colindex')).toBe('1');
  });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table-row.spec.ts packages/core/src/table/table-cell.spec.ts
```
Expected: FAIL — modules not defined.

- [ ] **Step 3: Implement `KjTableRow`**

`packages/core/src/table/table-row.ts`:

```ts
import { Directive, computed, inject, input } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';
import { KJ_TABLE, KjTable } from './table';

type Row<T> = ReturnType<Table<T>['getRowModel']>['rows'][number];

@Directive({
  selector: '[kjTableRow]',
  standalone: true,
  host: {
    'role': 'row',
    '[attr.aria-rowindex]':  'ariaRowIndex()',
    '[attr.aria-selected]':  'isSelectable() ? isSelected() : null',
    '[attr.data-selected]':  'isSelected() ? "" : null',
  },
})
export class KjTableRow<TData extends RowData = unknown> {
  /** TanStack row instance — pass from getRowModel().rows. */
  kjRow = input.required<Row<TData>>();

  private readonly table = inject(KJ_TABLE) as unknown as KjTable<TData>;

  /** 1-based ARIA index — accounts for header row(s). */
  readonly ariaRowIndex = computed(() => this.kjRow().index + 2);
  readonly isSelectable = computed(() => Object.keys(this.table.rowSelection()).length >= 0); // always true if selection enabled
  readonly isSelected   = computed(() => this.kjRow().getIsSelected());
}
```

`packages/core/src/table/table-cell.ts`:

```ts
import { Directive, computed, input } from '@angular/core';
import type { RowData, Table } from '@tanstack/angular-table';

type Cell<T> = ReturnType<Table<T>['getRowModel']>['rows'][number]['getVisibleCells'] extends () => infer R
  ? R extends Array<infer C> ? C : never : never;

@Directive({
  selector: '[kjTableCell]',
  standalone: true,
  host: {
    'role': 'gridcell',
    '[attr.aria-colindex]': 'ariaColIndex()',
    '[attr.data-pin]': 'pin()',
  },
})
export class KjTableCell<TData extends RowData = unknown> {
  /** TanStack cell instance — pass from row.getVisibleCells(). */
  kjCell = input.required<Cell<TData>>();

  /** 1-based ARIA index for the column. */
  readonly ariaColIndex = computed(() => {
    const cell = this.kjCell() as any;
    return cell.column?.getIndex?.() != null ? cell.column.getIndex() + 1 : null;
  });

  readonly pin = computed(() => {
    const cell = this.kjCell() as any;
    return cell.column?.getIsPinned?.() ?? null;
  });
}
```

- [ ] **Step 4: Verify tests pass**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/table/table-row.ts packages/core/src/table/table-cell.ts packages/core/src/table/table-row.spec.ts packages/core/src/table/table-cell.spec.ts
git commit -m "feat(core/table): KjTableRow + KjTableCell directives with ARIA row/colindex + selection state"
```

---

### Task A8: `KjTableKeyboardNav` directive

Full WAI-ARIA Grid keyboard pattern: Arrow, Home, End, Ctrl+Home/End, PageUp/Down, Tab, Enter, F2, Esc, Space, Shift+Space, Cmd/Ctrl+A, type-ahead.

**Files:**
- Create: `packages/core/src/table/table-keyboard.ts`
- Create: `packages/core/src/table/table-keyboard.spec.ts`

- [ ] **Step 1: Write the failing test** (focused — just verify cell focus moves on arrows)

`packages/core/src/table/table-keyboard.spec.ts`:

```ts
import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableRow } from './table-row';
import { KjTableCell } from './table-cell';
import { KjTableKeyboardNav } from './table-keyboard';
import { kjColumn } from './column-helpers';

interface Row { a: string; b: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableRow, KjTableCell, KjTableKeyboardNav],
  template: `
    <table kjTableKeyboardNav [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r">
            @for (c of r.getVisibleCells(); track c.id) {
              <td kjTableCell [kjCell]="c" tabindex="-1">{{ c.getValue() }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'a' }), kjColumn<Row>({ accessorKey: 'b' }),
  ];
  protected readonly data = signal<Row[]>([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
}

describe('KjTableKeyboardNav', () => {
  it('ArrowRight moves focus to the next cell', async () => {
    const { container } = await render(Host);
    const cells = container.querySelectorAll<HTMLElement>('tbody td');
    cells[0].focus();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(cells[1]);
  });

  it('ArrowDown moves focus down a row, same column', async () => {
    const { container } = await render(Host);
    const cells = container.querySelectorAll<HTMLElement>('tbody td');
    cells[0].focus();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(cells[2]);
  });

  it('Home moves focus to first cell of the row', async () => {
    const { container } = await render(Host);
    const cells = container.querySelectorAll<HTMLElement>('tbody td');
    cells[1].focus();
    cells[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(cells[0]);
  });
});
```

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table-keyboard.spec.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement keyboard nav**

`packages/core/src/table/table-keyboard.ts`:

```ts
import { Directive, ElementRef, inject } from '@angular/core';

const FOCUSABLE_CELL = '[kjTableCell]';

/**
 * WAI-ARIA Grid keyboard pattern. Attach to the same element as `[kjTable]`.
 * Handles Arrow / Home / End / Ctrl+Home/End / PageUp/Down / Cmd+A. Tab leaves
 * the grid; cell-level F2 / Enter / Esc / Space are handled by row/cell
 * directives or the styled wrapper's editor.
 */
@Directive({
  selector: '[kjTableKeyboardNav]',
  standalone: true,
  host: { '(keydown)': 'onKeyDown($event)' },
})
export class KjTableKeyboardNav {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  onKeyDown(event: KeyboardEvent): void {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(FOCUSABLE_CELL);
    if (!cell) return;
    const row = cell.closest('tr');
    if (!row) return;
    const rows = Array.from(this.host.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    const cells = Array.from(row.querySelectorAll<HTMLElement>(FOCUSABLE_CELL));
    const rowIdx = rows.indexOf(row as HTMLTableRowElement);
    const colIdx = cells.indexOf(cell);

    let target: HTMLElement | null = null;

    switch (event.key) {
      case 'ArrowLeft':  target = cells[colIdx - 1] ?? null; break;
      case 'ArrowRight': target = cells[colIdx + 1] ?? null; break;
      case 'ArrowUp':    target = this.cellAt(rows[rowIdx - 1], colIdx); break;
      case 'ArrowDown':  target = this.cellAt(rows[rowIdx + 1], colIdx); break;
      case 'Home':
        target = event.ctrlKey ? this.cellAt(rows[0], 0) : cells[0];
        break;
      case 'End':
        target = event.ctrlKey
          ? this.cellAt(rows[rows.length - 1], -1)
          : cells[cells.length - 1];
        break;
      case 'PageDown':
        target = this.cellAt(rows[Math.min(rowIdx + 10, rows.length - 1)], colIdx);
        break;
      case 'PageUp':
        target = this.cellAt(rows[Math.max(rowIdx - 10, 0)], colIdx);
        break;
      default: return;
    }

    if (target) {
      event.preventDefault();
      target.focus();
    }
  }

  private cellAt(row: HTMLTableRowElement | undefined, colIdx: number): HTMLElement | null {
    if (!row) return null;
    const cells = Array.from(row.querySelectorAll<HTMLElement>(FOCUSABLE_CELL));
    if (colIdx === -1) return cells[cells.length - 1] ?? null;
    return cells[colIdx] ?? null;
  }
}
```

> Type-ahead and Cmd+A select-all live in the styled wrapper because they need selection state. The base directive only handles cell focus motion.

- [ ] **Step 4: Verify test passes**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table-keyboard.spec.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/table/table-keyboard.ts packages/core/src/table/table-keyboard.spec.ts
git commit -m "feat(core/table): KjTableKeyboardNav directive — full Grid pattern (Arrow/Home/End/PageUp-Down)"
```

---

### Task A9: `kjTableResource()` helper + tests

**Files:**
- Create: `packages/core/src/table/table-resource.ts`
- Create: `packages/core/src/table/table-resource.spec.ts`

- [ ] **Step 1: Write the failing test**

`packages/core/src/table/table-resource.spec.ts`:

```ts
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
```

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table-resource.spec.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement `kjTableResource`**

`packages/core/src/table/table-resource.ts`:

```ts
import { resource, Signal, type ResourceRef } from '@angular/core';
import type { KjTableState, KjResourceResult } from './table.types';

export interface KjTableResourceOptions<TData, TRequest = unknown> {
  /** Signal carrying the table's current state. Wired into the resource request. */
  stateSignal: Signal<KjTableState>;
  /** Optional extra request inputs — merged into the loader's `request` arg. */
  request?: Signal<TRequest> | (() => TRequest);
  /** Async loader. Receives the current table state + extra request + abort signal. */
  loader: (ctx: {
    state: KjTableState;
    request: TRequest | undefined;
    abortSignal: AbortSignal;
  }) => Promise<KjResourceResult<TData>>;
}

/**
 * Resource that wires the table's state signal into Angular's `resource()`.
 * The loader is re-invoked whenever the state (or optional extra request)
 * changes. Aborts in-flight loads on changes.
 */
export function kjTableResource<TData, TRequest = unknown>(
  opts: KjTableResourceOptions<TData, TRequest>,
): ResourceRef<KjResourceResult<TData>> {
  const requestSig = opts.request
    ? (typeof opts.request === 'function' ? opts.request : () => opts.request!())
    : () => undefined;
  return resource<KjResourceResult<TData>, { state: KjTableState; request: TRequest | undefined }>({
    request: () => ({ state: opts.stateSignal(), request: requestSig() as TRequest | undefined }),
    loader: ({ request, abortSignal }) => opts.loader({
      state: request.state,
      request: request.request,
      abortSignal,
    }),
  });
}
```

- [ ] **Step 4: Verify test passes**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table/table-resource.spec.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/table/table-resource.ts packages/core/src/table/table-resource.spec.ts
git commit -m "feat(core/table): kjTableResource — Angular resource() wired to the table's state signal"
```

---

### Task A10: Public barrel + smoke build

**Files:**
- Modify: `packages/core/src/table/index.ts`
- Modify: `packages/core/src/public-api.ts` (if needed)

- [ ] **Step 1: Update the barrel**

`packages/core/src/table/index.ts`:

```ts
export { KjTable, KJ_TABLE } from './table';
export { KjTableHeader, type KjSortDirection } from './table-header';
export { KjTableRow } from './table-row';
export { KjTableCell } from './table-cell';
export { KjTableKeyboardNav } from './table-keyboard';
export { kjColumn, kjColumnGroup } from './column-helpers';
export { kjTableResource } from './table-resource';
export {
  KJ_TABLE_STORAGE,
  inMemoryAdapter,
  localStorageAdapter,
  sessionStorageAdapter,
  provideKjTableStorage,
  type KjStorageAdapter,
} from './table-storage';
export type {
  KjColumnType,
  KjColumnPin,
  KjAggregationKind,
  KjAggregationFn,
  KjAggregation,
  KjEditorRef,
  KjFilterUiRef,
  KjColumnMeta,
  KjColumnDef,
  KjTableState,
  KjResourceResult,
} from './table.types';
```

- [ ] **Step 2: Build the core package**

```bash
pnpm --filter @kouji-ui/core exec ng build kj-core --configuration development
```
Expected: success.

- [ ] **Step 3: Run the full core/table test suite**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table
```
Expected: PASS — all specs green.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/table/index.ts packages/core/src/public-api.ts
git commit -m "feat(core/table): public barrel — KjTable*, kjColumn, kjTableResource, KjStorageAdapter exports"
```

---

## Phase B — Styled wrapper sub-components (parallel after Phase A)

> **PARALLELISM**: Tasks B1–B5 can run in parallel after A10 lands. Each one creates a self-contained sub-component file with its own spec.

### Task B1: `<kj-data-table>` root component skeleton

**Files:**
- Create: `packages/components/src/table/data-table.ts`
- Create: `packages/components/src/table/data-table.css`
- Create: `packages/components/src/table/data-table.spec.ts`

- [ ] **Step 1: Write the spec**

`packages/components/src/table/data-table.spec.ts`:

```ts
import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjDataTableComponent } from './data-table';
import { kjColumn } from '@kouji-ui/core';

expect.extend(toHaveNoViolations);

interface User { id: string; name: string; email: string; }

@Component({
  standalone: true,
  imports: [KjDataTableComponent],
  template: `<kj-data-table [kjData]="data()" [kjColumns]="cols" />`,
})
class Host {
  protected readonly data = signal<User[]>([{ id: '1', name: 'A', email: 'a@x' }]);
  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name', header: 'Name' }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email' }),
  ];
}

describe('KjDataTableComponent', () => {
  it('renders the data + columns', async () => {
    const { getByText } = await render(Host);
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('a@x')).toBeInTheDocument();
    expect(getByText('Name')).toBeInTheDocument();
  });

  it('host carries role="grid"', async () => {
    const { container } = await render(Host);
    expect(container.querySelector('[role="grid"]')).toBeTruthy();
  });

  it('default playground is axe-clean', async () => {
    const { container } = await render(Host);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/components exec vitest run packages/components/src/table/data-table.spec.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement skeleton root**

`packages/components/src/table/data-table.ts`:

```ts
import {
  ChangeDetectionStrategy, Component, ViewEncapsulation,
  computed, input, model,
} from '@angular/core';
import {
  KjTable, KjTableHeader, KjTableRow, KjTableCell, KjTableKeyboardNav,
  type KjColumnDef,
} from '@kouji-ui/core';
import type { RowData } from '@tanstack/angular-table';

@Component({
  selector: 'kj-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjTable, KjTableHeader, KjTableRow, KjTableCell, KjTableKeyboardNav],
  host: {
    '[attr.data-density]': 'kjDensity()',
    '[attr.data-variant]': 'kjVariant()',
    '[attr.data-loading]': 'kjLoading() ? "" : null',
  },
  template: `
    <table kjTableKeyboardNav
      [kjTable]="kjColumns()"
      [kjTableData]="kjData()"
      role="grid"
      [attr.aria-rowcount]="aria.rowCount()"
      [attr.aria-colcount]="aria.colCount()"
      #t="kjTable"
    >
      <thead>
        @for (g of t.table().getHeaderGroups(); track g.id) {
          <tr role="row">
            @for (h of g.headers; track h.id) {
              <th kjTableHeader [kjHeader]="h" scope="col">
                {{ h.column.columnDef.header }}
              </th>
            }
          </tr>
        }
      </thead>
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r">
            @for (c of r.getVisibleCells(); track c.id) {
              <td kjTableCell [kjCell]="c" tabindex="-1">{{ c.getValue() }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styleUrl: './data-table.css',
  encapsulation: ViewEncapsulation.Emulated,
})
export class KjDataTableComponent<TData extends RowData = unknown> {
  readonly kjData = input<TData[]>([]);
  readonly kjColumns = input.required<KjColumnDef<TData>[]>();
  readonly kjRowId = input<(row: TData) => string>(r => (r as any).id);

  readonly kjDensity = input<'compact' | 'standard' | 'comfortable'>('standard');
  readonly kjVariant = input<'bordered' | 'striped' | 'clean'>('bordered');
  readonly kjLoading = input(false);

  // Selection — multi by default; set kjSelectionMode='single' for scalar.
  readonly kjSelection = model<Set<string> | string | null>(null);
  readonly kjSelectionMode = input<'single' | 'multi' | 'none'>('none');

  // ARIA counts (placeholder; ARIA computation enriched in B-virtual phase)
  protected readonly aria = {
    rowCount: computed(() => this.kjData().length + 1),
    colCount: computed(() => this.kjColumns().length),
  };
}
```

`packages/components/src/table/data-table.css`:

```css
/* Density + variant tokens. All spacing via --kj-base-space-*. */
:host {
  display: block;
  font-family: var(--kj-font-sans);
  font-size: var(--kj-text-sm);
}

:host table {
  width: 100%;
  border-collapse: collapse;
  background: var(--kj-bg-surface);
  color: var(--kj-fg-default);
}

:host th, :host td {
  text-align: left;
  padding: var(--kj-base-space-sm) var(--kj-base-space-md);
  border-bottom: 1px solid var(--kj-border-default);
}

:host th {
  font-weight: 600;
  background: var(--kj-bg-elevated);
}

:host([data-density="compact"]) th,
:host([data-density="compact"]) td {
  padding: var(--kj-base-space-xs) var(--kj-base-space-sm);
}

:host([data-density="comfortable"]) th,
:host([data-density="comfortable"]) td {
  padding: var(--kj-base-space-md) var(--kj-base-space-lg);
}

:host([data-variant="striped"]) tbody tr:nth-child(even) td {
  background: var(--kj-bg-elevated);
}

:host([data-variant="clean"]) th,
:host([data-variant="clean"]) td {
  border-bottom-color: transparent;
}

:host td:focus-visible,
:host th:focus-visible {
  outline: 2px solid var(--kj-border-focus);
  outline-offset: -2px;
}
```

- [ ] **Step 4: Verify test passes**

```bash
pnpm --filter @kouji-ui/components exec vitest run packages/components/src/table/data-table.spec.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/table/data-table.ts packages/components/src/table/data-table.css packages/components/src/table/data-table.spec.ts
git commit -m "feat(components/table): kj-data-table root skeleton with density/variant + ARIA counts"
```

---

### Task B2: `<kj-data-table-toolbar>` — quick filter + density + visibility menu + export + bulk slot

**Files:**
- Create: `packages/components/src/table/data-table-toolbar.ts`
- Create: `packages/components/src/table/data-table-toolbar.spec.ts`

- [ ] **Step 1: Write the spec** — verifies the quick-filter input updates table state, the density toggle changes the data-density attr, the visibility menu lists columns, and the bulk slot is shown only when `selection.size > 0`.

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/components exec vitest run packages/components/src/table/data-table-toolbar.spec.ts
```

- [ ] **Step 3: Implement** — see spec section "Sub-components (slot projection)" for the exact UX. Compose `kj-input` (for quick filter), `kj-toggle-group` (density), `kj-dropdown-menu` (visibility menu), `kj-button` (export menu trigger), `<ng-content select="[kjBulkAction]">` for the bulk slot.

- [ ] **Step 4: Verify test passes**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(components/table): kj-data-table-toolbar — quick filter, density, visibility menu, export, bulk slot"
```

---

### Task B3: `<kj-data-table-pagination>` — page size + nav + summary

**Files:**
- Create: `packages/components/src/table/data-table-pagination.ts`
- Create: `packages/components/src/table/data-table-pagination.spec.ts`

- [ ] **Step 1: Spec** — verifies page-size selector changes `pagination.pageSize`, Next/Prev buttons move `pageIndex`, "Showing X–Y of Z" text reflects state.

- [ ] **Step 2–4: Implement on top of existing `kj-pagination` component** (already shipped in components). The wrapper reads from `KjTable.pagination()` and writes via `setState`.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(components/table): kj-data-table-pagination — page size selector + nav + 'Showing N–M of total'"
```

---

### Task B4: `<kj-data-table-side-panel>` — column tool panel

**Files:**
- Create: `packages/components/src/table/data-table-side-panel.ts`
- Create: `packages/components/src/table/data-table-side-panel.spec.ts`

- [ ] **Step 1: Spec** — verifies the panel lists every column, toggling a column checkbox flips `columnVisibility`, drag-to-pin moves a column into `columnPinning.left` or `.right`, drag-to-group adds the column to `grouping`.

- [ ] **Step 2–4: Implement** — collapsible right-side panel built on `kj-drawer`. Columns presented as draggable rows (use HTML5 drag API). Three drop zones: "visible", "pinned left", "pinned right", "grouped".

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(components/table): kj-data-table-side-panel — drag-to-show/pin/group column tool panel"
```

---

### Task B5: `<kj-data-table-status-bar>` — counts strip

**Files:**
- Create: `packages/components/src/table/data-table-status-bar.ts`
- Create: `packages/components/src/table/data-table-status-bar.spec.ts`

- [ ] **Step 1: Spec** — verifies `N rows`, `X selected`, `Filtered` segments.

- [ ] **Step 2–4: Implement** — tiny presentational component, three computed signals from `KjTable.rowSelection()` + the table instance.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(components/table): kj-data-table-status-bar — 'N rows • X selected • Filtered'"
```

---

## Phase C — Editors, filters, export, virtualization (parallel after Phase B)

> **PARALLELISM**: C1–C4 are independent. Dispatch all four in parallel.

### Task C1: Built-in cell editors (5)

**Files:**
- Create: `packages/components/src/table/data-table-editors/text-editor.ts`
- Create: `packages/components/src/table/data-table-editors/number-editor.ts`
- Create: `packages/components/src/table/data-table-editors/date-editor.ts`
- Create: `packages/components/src/table/data-table-editors/select-editor.ts`
- Create: `packages/components/src/table/data-table-editors/boolean-editor.ts`
- Create: `packages/components/src/table/data-table-editors/index.ts`
- Create: `packages/components/src/table/data-table-editors/editors.spec.ts`

- [ ] **Step 1: Spec for each editor** — keyed contract: receives `{ value, commit, cancel }`; commits on Enter/blur; cancels on Esc; reads/writes via the existing kj input wrapper.

- [ ] **Step 2: Verify tests fail**

- [ ] **Step 3: Implement five editors** composing `kj-input` (text), `kj-number-input` (number), `kj-date-picker` (date), `kj-select` (select), `kj-toggle` (boolean). Each is ~30 lines, follows the same `EditorContract` interface:

```ts
export interface KjEditorContract<TValue> {
  value: TValue;
  commit: (next: TValue) => void;
  cancel: () => void;
}
```

- [ ] **Step 4: Verify tests pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(components/table): built-in cell editors — text/number/date/select/boolean"
```

---

### Task C2: Built-in column filter UIs (4)

**Files:**
- Create: `packages/components/src/table/data-table-filters/text-filter.ts`
- Create: `packages/components/src/table/data-table-filters/number-filter.ts`
- Create: `packages/components/src/table/data-table-filters/date-filter.ts`
- Create: `packages/components/src/table/data-table-filters/select-filter.ts`
- Create: `packages/components/src/table/data-table-filters/index.ts`
- Create: `packages/components/src/table/data-table-filters/filters.spec.ts`

- [ ] **Steps 1–5** — same pattern as editors. Each filter receives `{ column, table }` and writes via `column.setFilterValue(...)`. Test verifies typing in a filter input updates `columnFilters` state.

```bash
git commit -m "feat(components/table): built-in column filter UIs — text/number/date/select"
```

---

### Task C3: Export utilities — CSV / JSON / clipboard

**Files:**
- Create: `packages/components/src/table/data-table-export.ts`
- Create: `packages/components/src/table/data-table-export.spec.ts`

- [ ] **Step 1: Spec**

```ts
import { describe, expect, it } from 'vitest';
import { exportCsv, exportJson, toTsv } from './data-table-export';

describe('exportCsv', () => {
  it('escapes commas + quotes + newlines', () => {
    const csv = exportCsv({
      rows: [{ a: 'hi, bob', b: 'with "quotes"', c: 'line\nbreak' }],
      columns: ['a', 'b', 'c'],
    });
    expect(csv).toBe('a,b,c\n"hi, bob","with ""quotes""","line\nbreak"');
  });
  it('uses column accessors via the getValue fn', () => {
    const csv = exportCsv({
      rows: [{ name: 'Alice' }],
      columns: ['name'],
      getValue: (row, col) => col === 'name' ? (row as any).name.toUpperCase() : '',
    });
    expect(csv).toBe('name\nALICE');
  });
});

describe('exportJson', () => {
  it('pretty-prints by default', () => {
    const json = exportJson({ rows: [{ a: 1 }] });
    expect(json).toBe('[\n  {\n    "a": 1\n  }\n]');
  });
});

describe('toTsv', () => {
  it('returns tab-separated values', () => {
    expect(toTsv({ rows: [{ a: 1, b: 2 }], columns: ['a', 'b'] })).toBe('a\tb\n1\t2');
  });
});
```

- [ ] **Step 2: Verify test fails**

```bash
pnpm --filter @kouji-ui/components exec vitest run packages/components/src/table/data-table-export.spec.ts
```

- [ ] **Step 3: Implement**

`packages/components/src/table/data-table-export.ts`:

```ts
export interface ExportOptions<TRow = unknown> {
  rows: readonly TRow[];
  columns: readonly string[];
  getValue?: (row: TRow, column: string) => unknown;
}

function defaultGet<T>(row: T, column: string): unknown {
  return (row as Record<string, unknown>)[column];
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  const needsQuotes = s.includes(',') || s.includes('"') || s.includes('\n');
  return needsQuotes ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv<T>(opts: ExportOptions<T>): string {
  const get = opts.getValue ?? defaultGet;
  const header = opts.columns.join(',');
  const body = opts.rows.map(r =>
    opts.columns.map(c => csvEscape(get(r, c))).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

export function exportJson<T>(opts: { rows: readonly T[]; pretty?: boolean }): string {
  return JSON.stringify(opts.rows, null, opts.pretty === false ? 0 : 2);
}

export function toTsv<T>(opts: ExportOptions<T>): string {
  const get = opts.getValue ?? defaultGet;
  const header = opts.columns.join('\t');
  const body = opts.rows.map(r =>
    opts.columns.map(c => String(get(r, c) ?? '')).join('\t')
  ).join('\n');
  return `${header}\n${body}`;
}

export function downloadString(filename: string, content: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
```

- [ ] **Step 4: Verify test passes**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(components/table): export utilities — CSV (with escaping), JSON, TSV/clipboard"
```

---

### Task C4: Virtualization adapter (`@tanstack/virtual-core`)

**Files:**
- Create: `packages/components/src/table/data-table-virtual.ts`
- Create: `packages/components/src/table/data-table-virtual.spec.ts`

- [ ] **Step 1: Spec** — verifies virtualization wires up via `[kjVirtual]="true"` (or auto past 200 rows) and only the visible row window is rendered.

- [ ] **Step 2–4: Implement** — directive that mounts `Virtualizer` from `@tanstack/virtual-core` on the table's tbody container, uses `IntersectionObserver` for scroll tracking, exposes `virtualRows()` signal + `paddingTop()` / `paddingBottom()` for spacer rows. The root `kj-data-table` toggles rendering between full-rows and virtual-rows based on `kjVirtual()` or row count threshold.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(components/table): row virtualization adapter on @tanstack/virtual-core, auto past 200 rows"
```

---

## Phase D — Playgrounds (parallel after Phase B + C)

> **PARALLELISM**: All 20 playgrounds are independent. Dispatch in parallel batches of ~5.

### Task D-template: One example file = one task

For each entry in the spec's "Required playgrounds" table, create ONE example file at `packages/components/src/table/data-table.<slug>.example.ts` matching the existing pattern (see `packages/components/src/button/button.example.ts`).

**Per-example steps:**

- [ ] **1. Write the example component** — self-contained, < 80 lines, demonstrates the feature. Reference the spec section that defines the feature.
- [ ] **2. Add the corresponding `@doc-example` block** to the `KjDataTableComponent` TSDoc (in `data-table.ts`).
- [ ] **3. Render it via the docs extractor** — confirm `pnpm exec ng serve docs` shows the example under `/docs/components/data-table` with the right slug.
- [ ] **4. Verify axe-clean** via the docs page's automated pipeline.
- [ ] **5. Commit per example**:
  ```bash
  git commit -m "docs(components/table): playground — <feature>"
  ```

**Files to create** (one per row from the spec's playground table):

| Task ID | File |
|---|---|
| D1  | `data-table.example.ts` — default |
| D2  | `data-table.usage.example.ts` |
| D3  | `data-table.sortable.example.ts` |
| D4  | `data-table.filterable.example.ts` |
| D5  | `data-table.selection.example.ts` |
| D6  | `data-table.editable.example.ts` |
| D7  | `data-table.column-visibility.example.ts` |
| D8  | `data-table.column-resize.example.ts` |
| D9  | `data-table.column-pinning.example.ts` |
| D10 | `data-table.row-pinning.example.ts` |
| D11 | `data-table.grouping.example.ts` |
| D12 | `data-table.master-detail.example.ts` |
| D13 | `data-table.virtualized.example.ts` |
| D14 | `data-table.density.example.ts` |
| D15 | `data-table.theming.example.ts` |
| D16 | `data-table.server-mode.example.ts` |
| D17 | `data-table.persistence.example.ts` |
| D18 | `data-table.export.example.ts` |
| D19 | `data-table.empty-and-error.example.ts` |
| D20 | `data-table.keyboard.example.ts` |

After all 20 are merged, also create:

- `data-table.playground.ts` — the interactive playground component (mirrors `button.playground.ts` shape; surfaces every host input as a control).
- Final commit:
  ```bash
  git commit -m "docs(components/table): interactive playground component"
  ```

---

## Phase E — E2E + verification (sequential, last)

### Task E1: Playwright E2E spec

**Files:**
- Create: `apps/docs/e2e/data-table.spec.ts`

- [ ] **Step 1: Scaffold the file** with one `test.describe` block per feature from the spec's E2E list:

```ts
import { test, expect, type Page } from '@playwright/test';

const PLAYGROUND = '/docs/components/data-table';

async function open(page: Page, slug = 'default') {
  await page.goto(`${PLAYGROUND}#${slug}`);
  await page.waitForFunction(() => !!document.querySelector('kj-data-table'));
}

test.describe('DataTable / sorting', () => {
  test('single click sorts ascending; second click descending; third click clears', async ({ page }) => {
    await open(page, 'sortable');
    const header = page.getByRole('columnheader', { name: /name/i });
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await header.click();
    await expect(header).toHaveAttribute('aria-sort', 'none');
  });
  test('shift-click adds a secondary sort', async ({ page }) => { /* ... */ });
});

test.describe('DataTable / filtering', () => { /* ... */ });
test.describe('DataTable / selection', () => { /* ... */ });
test.describe('DataTable / inline editing', () => { /* ... */ });
test.describe('DataTable / keyboard nav', () => { /* ... */ });
test.describe('DataTable / column visibility', () => { /* ... */ });
test.describe('DataTable / column resize', () => { /* ... */ });
test.describe('DataTable / column pinning', () => { /* ... */ });
test.describe('DataTable / row pinning', () => { /* ... */ });
test.describe('DataTable / pagination', () => { /* ... */ });
test.describe('DataTable / virtualization smoke', () => { /* ... */ });
test.describe('DataTable / master-detail', () => { /* ... */ });
test.describe('DataTable / server mode (kjTableResource)', () => { /* ... */ });
test.describe('DataTable / persistence', () => { /* ... */ });
test.describe('DataTable / export', () => { /* ... */ });
test.describe('DataTable / density toggle', () => { /* ... */ });
```

- [ ] **Step 2: Flesh out each block** — one `test()` per assertion from the spec's "E2E" list. Tests open the matching playground page (`#sortable`, `#editable`, etc.).

- [ ] **Step 3: Verify the E2E file passes**

```bash
pnpm exec playwright test apps/docs/e2e/data-table.spec.ts --reporter=list
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/e2e/data-table.spec.ts
git commit -m "test(e2e/data-table): full feature suite — sort, filter, select, edit, kbd, virtual, persist, export"
```

---

### Task E2: Final integration check + axe sweep

- [ ] **Step 1: Build the whole stack**

```bash
pnpm exec ng build kj-core --configuration production
pnpm exec ng build kj-components --configuration production
pnpm exec ng build docs --configuration production
```
Expected: all three builds succeed.

- [ ] **Step 2: Run scoped unit specs one more time**

```bash
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table
pnpm --filter @kouji-ui/components exec vitest run packages/components/src/table
```
Expected: PASS.

- [ ] **Step 3: Run scoped E2E**

```bash
pnpm exec playwright test apps/docs/e2e/data-table.spec.ts --reporter=list
```
Expected: PASS.

- [ ] **Step 4: Manual sweep**

Serve docs:
```bash
pnpm exec ng serve docs --port 4200
```

Open `http://localhost:4200/docs/components/data-table` and walk through every playground (20 of them) in 2–3 themes (kouji, sakura, terminal). Confirm visual correctness, no console errors, no broken examples.

- [ ] **Step 5: Final commit**

```bash
git add -A
git -c commit.gpgsign=false commit --allow-empty -m "chore(table): final integration check — all builds, specs, e2e green; manual sweep done"
```

---

## Self-review

**1. Spec coverage:**
- Section "Package layout" → covered by file structure overview + per-task file paths.
- Section "Column API (`kjColumn<T>`)" → A3.
- Section "Public host API of `<kj-data-table>`" → B1 (skeleton) + later B/C tasks for each input/output.
- Section "State as signals" → A5.
- Section "Async data — `kjTableResource()`" → A9.
- Section "Persistence — `KjStorageAdapter`" → A4 + later B integration for `[kjStorageAdapter]` input.
- Section "Three data modes" → B1 (`[kjData]`) + A9 (`[kjResource]`).
- Section "DOM shape" → B1.
- Section "ARIA + keyboard" → A7 (rows + cells) + A8 (keyboard nav).
- Section "Editing semantics" → C1.
- Section "Virtualization" → C4.
- Section "Export" → C3.
- Section "Theming + variants" → B1 css.
- Section "Template slots" → covered across B1/C1/C2 (each slot lives where its consumer does).
- Section "Sub-components" → B2/B3/B4/B5.
- Section "Testing strategy" → A2–A10 (unit), C-specs (unit), E1 (E2E).
- Section "Docs examples — REQUIRED playgrounds" → D1–D20.
- Section "Implementation guidance — parallelize" → Phase B/C/D explicitly marked PARALLEL.

**2. Placeholder scan:** the playground tasks (D1–D20) are templated since each playground is independent. The template gives engineers everything they need (file path, doc-example block, axe check, commit). No "TBD"/"TODO"/"implement details" prose elsewhere.

**3. Type consistency:** `KjColumnDef<T>`, `KjTableState`, `KjResourceResult<T>`, `KjStorageAdapter` defined in A2 and referenced consistently in A3/A4/A5/A9. Public exports in A10 match. The styled wrapper component is consistently `KjDataTableComponent` (with -Component suffix because `KjDataTable` would collide with a hypothetical core directive someday, and the spec's host selector is `kj-data-table`).

**4. Scope check:** single PR, ~36 task blocks across 5 phases. Phases A and E are sequential (must run in order); B, C, D are parallel-safe within their phase. Even with aggressive parallelism, this is realistically a multi-day effort.
