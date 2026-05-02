# DocsTable Component — Design Spec

**Date:** 2026-05-02
**Scope:** `packages/core/src/table/` (base fixes) + `apps/docs/src/app/components/docs-table/` (new) + `apps/docs/src/app/pages/component-doc/` (integration)

---

## Goal

Create a reusable `DocsTableComponent` that uses `KjTableDirective` internally and replace the hand-rolled inputs table in `component-doc.html`. Fix two gaps in the base `KjTableHeaderDirective` discovered while building on top of it.

---

## Part 1: Base Directive Fixes (`KjTableHeaderDirective`)

### Fix 1 — Respect `getCanSort()`

Currently `KjTableHeaderDirective` always applies `cursor: pointer` and calls `toggleSort()` on click, even for columns with `enableSorting: false` in their `ColumnDef`.

**Change:**
- `[style.cursor]`: only `'pointer'` when `h.column.getCanSort()`, otherwise `null`
- `(click)` host binding: only calls `toggleSort()` when `getCanSort()` is true
- `[attr.aria-sort]`: only set when `getCanSort()` is true, otherwise `null`

```typescript
host: {
  '[style.cursor]': 'canSort() ? "pointer" : null',
  '[attr.aria-sort]': 'canSort() ? ariaSort() : null',
  '[attr.data-sort]': 'canSort() ? sortDir() : null',
  '(click)': 'onHeaderClick()',
},

readonly canSort = computed(() => this.kjHeader()?.column.getCanSort() ?? false);

onHeaderClick(): void {
  if (this.canSort()) this.toggleSort();
}
```

### Fix 2 — `data-sort` returns `null` when unsorted

Currently `sortDir()` returns `'none'` for unsorted columns, polluting the DOM with `data-sort="none"`.

**Change:** Return `null` instead of `'none'`:

```typescript
readonly sortDir = computed((): KjSortDirection | null => {
  const h = this.kjHeader();
  if (!h) return null;
  const sorted = h.column.getIsSorted();
  if (sorted === 'asc') return 'asc';
  if (sorted === 'desc') return 'desc';
  return null;
});
```

Update `KjSortDirection` type: `export type KjSortDirection = 'asc' | 'desc'` (remove `'none'`).

---

## Part 2: `DocsTableComponent`

### Location
`apps/docs/src/app/components/docs-table/`
- `docs-table.ts`
- `docs-table.html`
- `docs-table.css`

### Interface

```typescript
export interface DocsTableColumn {
  key: string;
  header: string;
}

@Component({ selector: 'docs-table' })
export class DocsTableComponent {
  columns = input.required<DocsTableColumn[]>();
  rows    = input.required<Record<string, unknown>[]>();
}
```

### Column Defs

Internally converts `DocsTableColumn[]` to `ColumnDef<Record<string, unknown>>[]` using TanStack's `createColumnHelper`. All columns have `enableSorting: false` — the docs table is read-only.

```typescript
private readonly columnHelper = createColumnHelper<Record<string, unknown>>();

readonly columnDefs = computed(() =>
  this.columns().map(col =>
    this.columnHelper.accessor(row => row[col.key], {
      id: col.key,
      header: col.header,
      enableSorting: false,
    })
  )
);
```

### Template

```html
<table [kjTable]="columnDefs()" [kjTableData]="rows()" #tbl="kjTable">
  <thead>
    @for (hg of tbl.table().getHeaderGroups(); track hg.id) {
      <tr>
        @for (h of hg.headers; track h.id) {
          <th kjTableHeader [kjHeader]="h" scope="col">
            {{ h.column.columnDef.header }}
          </th>
        }
      </tr>
    }
  </thead>
  <tbody>
    @for (row of tbl.table().getRowModel().rows; track row.id) {
      <tr>
        @for (cell of row.getVisibleCells(); track cell.id) {
          <td [attr.data-col]="cell.column.id">
            @if (cell.column.id === 'name' && row.original['required']) {
              <span class="cell-name">{{ cell.getValue() }}</span><span class="required-mark">*</span>
            } @else {
              {{ cell.getValue() ?? '—' }}
            }
          </td>
        }
      </tr>
    }
  </tbody>
</table>
@if (!rows().length) {
  <p class="empty">No entries.</p>
}
```

### Styling

Matches the current docs table aesthetic (monospace font, border, subtle row separators). The `[data-col="name"]` attribute lets consumers target the name column specifically via CSS.

---

## Part 3: Integration in `component-doc.html`

Replace the existing `<div class="inputs-block">` block:

```html
@if (directive.inputs.length) {
  <div class="inputs-block">
    <h3 class="block-title">Inputs</h3>
    <docs-table
      [columns]="inputColumns"
      [rows]="directive.inputs"
    />
    <p class="required-note">* required</p>
  </div>
}
```

Where `inputColumns` is defined once in `component-doc.ts`:

```typescript
protected readonly inputColumns: DocsTableColumn[] = [
  { key: 'name',         header: 'Name'        },
  { key: 'type',         header: 'Type'        },
  { key: 'defaultValue', header: 'Default'     },
  { key: 'description',  header: 'Description' },
];
```

Remove the old `.inputs-table`, `.inputs-header`, `.input-row`, `.inp-*` CSS rules from `component-doc.css`.

---

## Files Touched

| File | Change |
|---|---|
| `packages/core/src/table/table.directive.ts` | Fix `KjTableHeaderDirective` — `canSort()` guard, `data-sort` null fix, `KjSortDirection` type update |
| `packages/core/src/table/table.directive.spec.ts` | Update tests for new `sortDir` return type |
| `apps/docs/src/app/components/docs-table/docs-table.ts` | NEW |
| `apps/docs/src/app/components/docs-table/docs-table.html` | NEW |
| `apps/docs/src/app/components/docs-table/docs-table.css` | NEW |
| `apps/docs/src/app/pages/component-doc/component-doc.ts` | Add `inputColumns`, import `DocsTableComponent` |
| `apps/docs/src/app/pages/component-doc/component-doc.html` | Replace inputs table markup with `<docs-table>` |
| `apps/docs/src/app/pages/component-doc/component-doc.css` | Remove old inputs table CSS |
