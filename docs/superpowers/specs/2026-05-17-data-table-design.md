# DataTable Design — v0.2

**Date:** 2026-05-17
**Status:** approved (draft → implementation plan next)
**Roadmap card:** `apps/docs/src/app/pages/roadmap/items/v0.2-data-table.md`

## Goal

Ship `<kj-data-table>` — a comprehensive, AG-Grid-class data table for Angular built on `@tanstack/angular-table`. Expose every TanStack-native feature; layer kj-owned UX (toolbar, side panel, status bar, pagination, density, editing, virtualization, exports, persistence) on top; meet the WAI-ARIA Grid pattern out of the box.

Single PR. v0.2 release target.

## Non-goals (explicit)

- **PDF export** — not on roadmap.
- **Cursor-based pagination** — defer to v0.3. TanStack doesn't have first-class support; we'd extend the resource result with optional cursor fields and add a separate pagination mode.
- **Tree data with lazy children** — v0.3. (Flat-rendered expansion / master-detail using TanStack's `getExpandedRowModel` IS in scope.)
- **Column virtualization** for very wide tables — v0.3. Row virtualization IS in scope.

## Package layout

```
packages/core/src/table/                   # headless (evolves existing primitive)
  table.ts                                  # KjTable directive — all state signals + DI token
  table-header.ts                           # KjTableHeader — sort UI + ARIA
  table-row.ts                              # KjTableRow — selection + ARIA
  table-cell.ts                             # KjTableCell — ARIA + focus participation
  table-keyboard.ts                         # KjTableKeyboardNav directive — full grid kbd pattern
  column-helpers.ts                         # kjColumn(), kjColumnGroup(), kjAgg helpers
  table-resource.ts                         # kjTableResource() helper around Angular resource()
  table-storage.ts                          # KjStorageAdapter token + adapters
  table.types.ts                            # KjColumnDef<T>, KjTableState, exported types
  index.ts

packages/components/src/table/             # styled wrapper (new)
  data-table.ts                              # <kj-data-table> root component
  data-table-toolbar.ts                     # quick filter + density + column visibility + bulk slot + export menu
  data-table-pagination.ts                  # page size + "Showing N–M of total" + jump
  data-table-side-panel.ts                  # column tool panel: show/hide/pin/group via drag
  data-table-status-bar.ts                  # N rows • X selected • Filtered
  data-table-editors/                        # built-in cell editors (text/number/select/date/checkbox)
  data-table-filters/                        # built-in column filter UIs (text/number/select/date)
  data-table.css                             # variants + density + theming hooks
  index.ts
```

## Column API — `kjColumn<T>`

Thin wrapper around TanStack's `ColumnDef<T>`. Pass-through for everything TanStack-native; adds typed `kj*` knobs at the top level (stored in `meta.kj` under the hood).

```ts
import { kjColumn } from '@kouji-ui/core';

readonly columns = [
  // Minimum
  kjColumn<User>({ accessorKey: 'name', header: 'Name' }),

  // Editable + filterable; type inferred from value
  kjColumn<User>({
    accessorKey: 'email',
    header: 'Email',
    kjEditable: true,
    kjFilterable: true,
  }),

  // Explicit type — drives filter widget + editor widget + formatter + alignment
  kjColumn<User>({
    accessorKey: 'createdAt',
    header: 'Created',
    kjType: 'date',
    kjEditable: true,
    kjPin: 'right',
  }),

  // Custom editor / filter via component class or TemplateRef
  kjColumn<User>({
    accessorKey: 'department',
    header: 'Department',
    kjEditable: true,
    kjEditor: DepartmentPickerComponent,
    kjFilterUi: DepartmentFilterComponent,
  }),
];
```

### kj knobs (all optional unless noted)

| Knob | Default | Purpose |
|---|---|---|
| `kjType` | inferred from sample value | `'text' \| 'number' \| 'date' \| 'boolean' \| 'select'` — drives filter, editor, formatter, alignment |
| `kjEditable` | `false` | enables inline editing; editor inferred from `kjType` unless `kjEditor` overrides |
| `kjFilterable` | `true` (except `boolean`) | enables column filter UI |
| `kjPin` | `null` | `'left' \| 'right' \| null` |
| `kjGroup` | `false` | enables drag-to-group + grouping aggregation |
| `kjAgg` | `null` | `'sum' \| 'avg' \| 'min' \| 'max' \| 'count'` or `(rows) => value` |
| `kjEditor` | (built-in for `kjType`) | override editor: component class or `TemplateRef` |
| `kjFilterUi` | (built-in for `kjType`) | override filter UI: component class or `TemplateRef` |
| `kjSelectOptions` | — | required when `kjType: 'select'`; `string[] \| { value, label }[]` |
| `kjExportable` | `true` | include in CSV / JSON / clipboard exports |

Plus a `kjColumnGroup<T>({ header, columns })` helper for header grouping.

## Public host API — `<kj-data-table>`

### Minimum

```html
<kj-data-table [kjData]="users()" [kjColumns]="cols" />
```

### Common case

```html
<kj-data-table
  [kjData]="users()"
  [kjColumns]="cols"
  [(kjSelection)]="selected"
  kjTableId="users"
/>
```

### Full example

```html
<kj-data-table
  [kjResource]="usersResource"
  [kjColumns]="cols"
  [kjRowId]="r => r.id"

  [(kjSelection)]="selected"
  kjSelectionMode="multi"

  kjDensity="standard"
  kjVariant="bordered"

  kjTableId="users"
  [kjStorageAdapter]="sessionStorageAdapter()"

  (rowClick)="open($event.row)"
  (cellEdit)="save($event)"
  (stateChange)="onState($event)"
>
  <!-- Toolbar projection — bulk actions show when selection.size > 0 -->
  <kj-data-table-toolbar>
    <kj-button kjVariant="destructive" *kjBulkAction>Delete</kj-button>
  </kj-data-table-toolbar>

  <!-- Per-column cell template -->
  <ng-template kjCell="role" let-row let-value="value">
    <kj-badge [kjVariant]="value === 'admin' ? 'destructive' : 'default'">{{ value }}</kj-badge>
  </ng-template>

  <!-- Per-row detail panel -->
  <ng-template kjRowDetail let-row>
    <user-profile-panel [user]="row" />
  </ng-template>

  <!-- Status bar + pagination — project them where you want -->
  <kj-data-table-status-bar />
  <kj-data-table-pagination />
</kj-data-table>
```

### Inputs

| Input | Default | Notes |
|---|---|---|
| `[kjData]` | — | sync data — array or `signal<T[]>()`. Mutually exclusive with `[kjResource]`. |
| `[kjResource]` | — | async data — any Angular `ResourceRef<{rows, rowCount}>` (typically built with `kjTableResource()`). |
| `[kjColumns]` | required | column defs from `kjColumn<T>()` |
| `[kjRowId]` | `r => r.id` | row identity for selection / expansion / persistence |
| `[(kjSelection)]` | — | `Set<rowId>` for multi, scalar / `null` for single |
| `kjSelectionMode` | inferred | `'single' \| 'multi' \| 'none'` — inferred from `[(kjSelection)]` binding type |
| `kjDensity` | `'standard'` | `'compact' \| 'standard' \| 'comfortable'` |
| `kjVariant` | `'bordered'` | `'bordered' \| 'striped' \| 'clean'` |
| `[kjVirtual]` | auto (> 200 rows) | force virtualization on/off |
| `kjTableId` | — | enables persistence when set (and storage adapter exists) |
| `[kjStorageAdapter]` | from DI | per-table override of the storage adapter |
| `[kjPageSize]` | `25` | initial page size |
| `[kjPageSizeOptions]` | `[10, 25, 50, 100]` | options in the page-size selector |
| `[kjEmptyMessage]` | `'No data'` | empty state copy |
| `[kjLoadingSkeletonCount]` | `8` | number of skeleton rows during loading |

### Outputs

| Output | Payload | Notes |
|---|---|---|
| `(stateChange)` | `KjTableState` | omnibus — fires after any state mutation |
| `(sortChange)` | `SortingState` | TanStack-native |
| `(filterChange)` | `{ columnFilters, globalFilter }` | |
| `(selectionChange)` | `Set<rowId>` / scalar | |
| `(paginationChange)` | `{ pageIndex, pageSize }` | |
| `(rowClick)` | `{ row, event }` | |
| `(rowDblclick)` | `{ row, event }` | |
| `(cellEdit)` | `{ row, columnId, oldValue, newValue }` | fires on commit |
| `(rowReorder)` | `{ fromIndex, toIndex, row }` | drag-to-reorder |
| `(expandedChange)` | `Set<rowId>` | master-detail / sub-rows |

## State as signals (on `KjTable` directive / `tableRef`)

```ts
tableRef.sorting()           // SortingState
tableRef.columnFilters()     // ColumnFiltersState
tableRef.globalFilter()      // string
tableRef.rowSelection()      // Record<rowId, boolean>
tableRef.pagination()        // { pageIndex, pageSize }
tableRef.columnSizing()      // Record<colId, width>
tableRef.columnVisibility()  // Record<colId, boolean>
tableRef.columnOrder()       // colId[]
tableRef.columnPinning()     // { left, right }
tableRef.expanded()          // Record<rowId, boolean>
tableRef.grouping()          // colId[]
```

Imperative:

```ts
tableRef.resetState()
tableRef.getState(): KjTableState
tableRef.setState(partial: Partial<KjTableState>)
tableRef.exportCsv({ selectedOnly?: boolean })
tableRef.exportJson({ selectedOnly?: boolean })
tableRef.copyToClipboard()
tableRef.scrollToRow(rowId)
tableRef.focusCell(rowId, columnId)
```

## Async data — `kjTableResource()`

Thin wrapper around Angular's `resource()` that wires the table's state signal into the resource's `request`.

```ts
import { kjTableResource } from '@kouji-ui/core';

protected readonly users = kjTableResource<User>({
  loader: async ({ state, abortSignal }) => {
    const res = await this.api.queryUsers({
      sort:     state.sorting,
      filters:  state.columnFilters,
      search:   state.globalFilter,
      page:     state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
    }, { signal: abortSignal });

    return { rows: res.data, rowCount: res.total };
  },
});
```

Loader signature: `({ state, abortSignal, request }) => Promise<{ rows, rowCount }>`.

The result shape is intentionally minimal — matches TanStack's `manualPagination` + `rowCount` API one-to-one:

```ts
interface KjResourceResult<T> {
  rows: readonly T[];
  rowCount: number;
}
```

TanStack handles the rest: page-count math, last-page clamping when filters reduce the total, "showing N–M of total" computation.

### Extra resource power (free with Angular's `resource()`)

```ts
// Dependent reloads — re-fetch when an external signal changes
protected readonly users = kjTableResource<User>({
  request: () => ({ deptId: this.activeDept() }),
  loader: async ({ state, request, abortSignal }) =>
    this.api.queryUsers({ ...state, deptId: request.deptId }, { signal: abortSignal }),
});

// Manual reload
this.users.reload();

// Status / error signals
this.users.status();   // 'idle' | 'loading' | 'reloading' | 'resolved' | 'error'
this.users.error();
this.users.value();    // { rows, rowCount } | undefined
```

### How the table consumes the resource

| `status()` | Renders |
|---|---|
| `'loading'` (initial) | skeleton rows × `kjLoadingSkeletonCount` |
| `'reloading'` (data exists) | overlay spinner; existing rows remain |
| `'error'` | error template slot (default: `kj-empty-state` + Retry button → `resource.reload()`) |
| `'resolved'` | real rows |

Pagination math uses `value().rowCount` directly.

### Raw `resource()` is supported

`[kjResource]` accepts any `ResourceRef<{ rows, rowCount }>`. `kjTableResource()` is recommended because it auto-wires the table state into the request; raw resources are fine if you already have one and want to wire it manually.

## Persistence — `KjStorageAdapter`

### Default behavior (no config)

- Browser: `localStorageAdapter()`
- SSR / tests: `inMemoryAdapter()`

Persistence is enabled per-table by setting `kjTableId`. Without `kjTableId`, no state is persisted regardless of adapter.

### Override at app scope

```ts
import { provideKjTableStorage, sessionStorageAdapter } from '@kouji-ui/core';

bootstrapApplication(App, {
  providers: [provideKjTableStorage(sessionStorageAdapter({ keyPrefix: 'myapp:' }))],
});
```

### Override per table

```html
<kj-data-table kjTableId="x" [kjStorageAdapter]="myApiAdapter" ... />
```

### Lookup order (most specific wins)

1. `[kjStorageAdapter]` on the table
2. `provideKjTableStorage(...)` DI provider
3. Smart default (localStorage in browser, in-memory elsewhere)

### Adapter contract

```ts
interface KjStorageAdapter {
  read<T>(key: string): T | null;
  write<T>(key: string, value: T): void;
}
```

### What's persisted

- `sorting`, `columnFilters`, `globalFilter`
- `columnSizing`, `columnVisibility`, `columnOrder`, `columnPinning`
- `pagination.pageSize` (page index is not persisted — always starts at 0)
- `density`, `expanded`, `grouping`

### Opt-out

- Per-slice: `kjPersist: false` knob on a column definition skips that slice for the column.
- Whole table: omit `kjTableId`.

## Three data modes — one rule of thumb

| Mode | Input | Rows live where | Sort/filter/page |
|---|---|---|---|
| Constant array | `[kjData]="[…]"` | array literal | client |
| Reactive client | `[kjData]="signal()"` | your component | client |
| Server / async | `[kjResource]="users"` | server | server (via loader) |

`[kjData]` and `[kjResource]` are mutually exclusive — passing both is a build-time error.

## DOM shape

Semantic `<table>` markup throughout. CSS overrides `display: grid` / `display: flex` on `<table>` / `<tbody>` when virtualization or column pinning needs precise control over row layout. Falls back to native table layout in the simple case.

```html
<table role="grid" aria-rowcount="…" aria-colcount="…" aria-multiselectable="…">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="…" aria-colindex="…" scope="col">…</th>
    </tr>
    <!-- Optional floating filter row -->
    <tr role="row">
      <th>…filter widget…</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-rowindex="…" aria-selected="…">
      <td role="gridcell" aria-colindex="…" tabindex="…">…</td>
    </tr>
  </tbody>
</table>
```

## ARIA + keyboard

### ARIA

- Root: `role="grid"`, `aria-rowcount`, `aria-colcount`, `aria-multiselectable`
- Header cell: `aria-sort`, `aria-colindex`, `scope="col"`
- Row: `aria-rowindex`, `aria-selected` (when selectable)
- Cell: `aria-colindex`, roving `tabindex`

### Live-region announcements (via `KjLiveRegion`)

- Sort: "Sorted by Name, ascending"
- Filter: "Filtered to 23 of 248 rows"
- Selection: "3 of 248 selected"
- Pagination: "Page 2 of 10"
- Edit: "Editing Email. Press Escape to cancel."

### Keyboard (full Grid pattern)

| Key | Action |
|---|---|
| Arrow | Move focus to adjacent cell |
| Home / End | First / last cell of row |
| Ctrl+Home / Ctrl+End | First / last cell of grid |
| PageUp / PageDown | Move focus by viewport-height of rows |
| Tab | Move focus to next cell (or out of grid when at last cell — Tab semantics) |
| Enter | Activate cell action (sort header / start edit / row click handler) |
| F2 | Start editing (when `kjEditable`) |
| Esc | Cancel edit / clear selection |
| Space | Toggle row selection |
| Shift+Space | Select range from anchor |
| Cmd/Ctrl+A | Select all visible rows |
| Typed chars | Type-ahead by first column text |

Focus management: focus returns to the previously focused cell after sort, filter, resize, column visibility change, or pagination.

## Editing semantics

- Triggered by: `Enter`, `F2`, or double-click (configurable via `kjEditTrigger` host input).
- Commit: `Enter` or blur.
- Cancel: `Esc`.
- Built-in editors compose existing kj inputs:
  - `text` → `<kj-input>`
  - `number` → `<kj-number-input>`
  - `date` → `<kj-date-picker>`
  - `select` → `<kj-select>` populated from `kjSelectOptions`
  - `boolean` → `<kj-toggle>`
- Custom editors: `kjEditor: ComponentClass | TemplateRef`.
- Validation: editors can implement Angular's `NG_VALIDATORS` contract; commit is blocked while invalid; error rendered inline.

## Virtualization

- Library: `@tanstack/virtual-core` (add to package deps).
- Auto-enabled when `data.length > 200`, unless `[kjVirtual]` is set explicitly.
- Row virtualization only in v0.2 (column virtualization is v0.3).
- Compatible with column pinning (pinned columns render outside the virtualized window).

## Export

- `tableRef.exportCsv({ selectedOnly })` — respects current sort / filter / column visibility / column order.
- `tableRef.exportJson({ selectedOnly })` — same.
- `tableRef.copyToClipboard()` — TSV (Excel-friendly).
- All exporters use the column accessors → works regardless of cell template.
- Toolbar's export menu is the default UI; consumers can also call the imperative API.

## Theming + variants

- `[data-density]="compact|standard|comfortable"` host attr → drives row height + cell padding via `--kj-base-space-*`.
- `[data-variant]="bordered|striped|clean"` host attr → toggles row dividers / zebra stripes / clean (no chrome).
- All visuals via `--kj-*` tokens — works across all 13 themes.
- `forced-colors: active` + `prefers-reduced-motion: reduce` supported.

## Template slots

| Template ref | Context | When |
|---|---|---|
| `*kjCell="<colId>"` | `let row, let value, let rowIndex` | render a cell for that column |
| `*kjHeader="<colId>"` | `let header` | custom header |
| `*kjFilter="<colId>"` | `let column, let table` | custom column filter UI |
| `*kjEditCell="<colId>"` | `let row, let value, let commit, let cancel` | custom inline editor |
| `*kjRowDetail` | `let row` | master-detail panel |
| `*kjEmpty` | — | empty state |
| `*kjLoadingRow` | `let skeletonIndex` | per-row skeleton |
| `*kjError` | `let error` | error state |

## Sub-components (slot projection)

| Selector | Purpose |
|---|---|
| `<kj-data-table-toolbar>` | quick filter input, density toggle, column visibility menu, export menu, slot for bulk actions (`*kjBulkAction`) |
| `<kj-data-table-side-panel>` | drag-to-show/hide/pin/group column tool panel |
| `<kj-data-table-status-bar>` | `N rows • X selected • Filtered` strip |
| `<kj-data-table-pagination>` | page size selector + page navigation + "Showing N–M of total" |

All four are optional; render if projected. Sensible default toolbar + pagination render automatically when not explicitly projected.

## Testing strategy

> **Scope rule for implementation agents:** all test runs invoked during this work MUST target only table-related specs. Do not run the full project test suite — it's slow and noise from unrelated specs masks real failures. See the scoped commands below.

### Unit (`packages/core/src/table/*.spec.ts` + `packages/components/src/table/*.spec.ts`)

- Column helpers — `kjColumn()` type inference, meta storage.
- Storage adapters — localStorage, sessionStorage, in-memory round-trip.
- Keyboard nav — arrow navigation, type-ahead, Cmd+A select-all, F2/Enter/Esc.
- ARIA computation — `aria-sort`, `aria-rowindex` under virtualization.
- Sort / filter / pagination — accumulators, multi-sort with shift, page clamping.
- Export formatters — CSV escaping, JSON shape, TSV.
- `kjTableResource()` — state-to-request wiring, abort on state change, error → retry.

**Scoped invocation** (run ONLY table specs, not the whole project):

```bash
# Core package, table specs only
pnpm --filter @kouji-ui/core exec vitest run packages/core/src/table

# Components package, table specs only
pnpm --filter @kouji-ui/components exec vitest run packages/components/src/table

# Both at once via turbo with a path filter
pnpm exec turbo run test --filter='@kouji-ui/core' --filter='@kouji-ui/components' -- packages/*/src/table
```

### E2E (`apps/docs/e2e/data-table.spec.ts`)

One block per major feature:

- Renders all columns from a fixed dataset.
- Sort: single click sorts asc → desc → unset; shift-click adds multi-sort.
- Column filter: text + number + select + date.
- Global filter (toolbar).
- Selection: single, multi, header checkbox, range with shift.
- Bulk-action toolbar appears with selection.
- Density toggle.
- Column visibility menu.
- Column resize (drag + keyboard).
- Column pinning.
- Row pinning.
- Pagination (offset).
- Inline edit: built-in `text`, custom `kjEditor` component.
- Virtual scroll: smoke test (large dataset renders, scroll positions correctly).
- Master-detail expansion.
- Server mode via `kjTableResource()` — mock loader, sort/filter/page triggers reload.
- Persistence: state survives page refresh (localStorage round-trip via `kjTableId`).
- Keyboard nav: Arrow / Home / End / Tab / Enter / F2 / Esc / Space / Cmd+A.
- Export: CSV file download, JSON file, clipboard.

**Scoped invocation** (run ONLY the table e2e file):

```bash
pnpm exec playwright test apps/docs/e2e/data-table.spec.ts --reporter=list
```

### Docs examples — REQUIRED playgrounds

Every feature in this spec ships an interactive playground at `/docs/components/data-table`. Each playground:

- Lives next to its `kj-data-table` example file under `packages/components/src/table/data-table.<example>.example.ts`.
- Is registered as a `@doc-example` on the `KjDataTable` component TSDoc block (already-established convention; see `button.ts` and `tag.ts` for templates).
- Is a self-contained component using only `kj-data-table` + the kj-component dependencies it actually needs.
- Has terse, opinionated copy that explains *why* the example is interesting (not just *what* it shows).

Required playgrounds (one `@doc-example` per row):

| File suffix | Showcases |
|---|---|
| `data-table.example.ts` | default playground — single column, sortable, no chrome |
| `data-table.usage.example.ts` | the canonical "drop it in and ship" example — 4–6 columns, sort, filter, selection, pagination |
| `data-table.sortable.example.ts` | single + multi-sort with shift |
| `data-table.filterable.example.ts` | column filters (text + number + select + date) + global quick filter |
| `data-table.selection.example.ts` | single, multi, range select, bulk-action toolbar |
| `data-table.editable.example.ts` | inline editing — built-in editors + a custom component editor |
| `data-table.column-visibility.example.ts` | toolbar menu to show/hide columns |
| `data-table.column-resize.example.ts` | drag + keyboard resize, persisted widths |
| `data-table.column-pinning.example.ts` | pin left + right, scroll horizontally |
| `data-table.row-pinning.example.ts` | sticky top + bottom summary rows |
| `data-table.grouping.example.ts` | drag-to-group + aggregation |
| `data-table.master-detail.example.ts` | row detail panel via `kjRowDetail` template |
| `data-table.virtualized.example.ts` | 10k-row dataset with virtual scroll |
| `data-table.density.example.ts` | compact / standard / comfortable toggle |
| `data-table.theming.example.ts` | bordered / striped / clean variants across themes |
| `data-table.server-mode.example.ts` | `kjTableResource` with a mock async loader (artificial 600ms delay) |
| `data-table.persistence.example.ts` | demonstrates state survival across refresh via `kjTableId` |
| `data-table.export.example.ts` | CSV + JSON + clipboard export buttons in toolbar |
| `data-table.empty-and-error.example.ts` | empty state + error state slots |
| `data-table.keyboard.example.ts` | annotated keyboard map with a focusable demo grid |

Every playground:
- Is exported from `packages/components/src/table/index.ts`.
- Renders cleanly in all 13 themes (no hardcoded colors).
- Passes axe-core in the docs page's automated a11y pipeline.

## Implementation guidance

This is a single large PR. The writing-plans step that follows should:

- **Parallelize aggressively.** Many tasks have no shared state — the storage adapter unit specs, the column-helper type tests, the various playground examples, the keyboard-nav directive, the editor wrappers, the filter wrappers — these can all be dispatched in parallel via the `superpowers:dispatching-parallel-agents` skill. The implementation plan should explicitly mark which tasks block which.
- **Stay scoped when running tests.** Use the scoped invocations above. A full-project test run pays a 30-second penalty for noise from unrelated changes and slows the iteration loop.
- **Land the headless layer (`@kouji-ui/core/src/table`) first, in one slice.** The styled wrapper, sub-components, editors, filters, and playgrounds can fan out in parallel once the directive surface is stable.

## Verification plan

- `pnpm exec ng build packages/core packages/components docs --configuration production` — clean build.
- `pnpm exec ng lint core components docs` — zero new errors.
- `pnpm exec vitest run --project core --project components` — unit specs green.
- `pnpm exec playwright test apps/docs/e2e/data-table.spec.ts` — full E2E suite green.
- Manual visual sweep across all 13 themes via `/docs/components/data-table` playgrounds.
- Axe-core: zero violations on the default playground.

## Migration / compat

- The existing `KjTable` + `KjTableHeader` primitives in `packages/core/src/table/` are **enhanced in place**. The public surface grows (more state signals, more directives) — existing consumers don't break.
- New `<kj-data-table>` lives in `@kouji-ui/components`. No clash.
