# DocsTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two gaps in `KjTableHeaderDirective`, then build `DocsTableComponent` on top of `KjTableDirective` and wire it into the component-doc page.

**Architecture:** Three sequential tasks: (1) fix base directive, (2) create `DocsTableComponent` using `KjTableDirective` with generic `columns`/`rows` inputs and the `required *` indicator built into the name cell, (3) integrate into `component-doc` replacing the hand-rolled grid. All sorting disabled on the docs table via TanStack's `enableSorting: false`.

**Tech Stack:** Angular 21 signals, TanStack Angular Table (`@tanstack/angular-table`), `@testing-library/angular`, `jest-axe`

---

## File Map

| File | Change |
|---|---|
| `packages/core/src/table/table.directive.ts` | Fix `KjTableHeaderDirective` — `canSort()` guard, null `data-sort`, update `KjSortDirection` type |
| `packages/core/src/table/table.directive.spec.ts` | Add tests for non-sortable column behavior |
| `apps/docs/src/app/components/docs-table/docs-table.ts` | NEW — `DocsTableComponent` |
| `apps/docs/src/app/components/docs-table/docs-table.html` | NEW — table template |
| `apps/docs/src/app/components/docs-table/docs-table.css` | NEW — table styles |
| `apps/docs/src/app/pages/component-doc/component-doc.ts` | Add `DocsTableComponent` import + `inputColumns` |
| `apps/docs/src/app/pages/component-doc/component-doc.html` | Replace inputs table markup |
| `apps/docs/src/app/pages/component-doc/component-doc.css` | Remove old inputs table CSS |

---

## Task 1: Fix KjTableHeaderDirective

**Files:**
- Modify: `packages/core/src/table/table.directive.ts`
- Modify: `packages/core/src/table/table.directive.spec.ts`

- [ ] **Step 1: Write a failing test for non-sortable header**

Add this test to `packages/core/src/table/table.directive.spec.ts`, inside the existing `describe('KjTableDirective')` block, after the existing tests:

```typescript
it('non-sortable column header has no cursor:pointer', async () => {
  @Component({
    standalone: true,
    imports: [KjTableDirective, KjTableHeaderDirective],
    template: `
      <table [kjTable]="columns" [kjTableData]="data" #tbl="kjTable">
        <thead>
          @for (hg of tbl.table().getHeaderGroups(); track hg.id) {
            <tr>
              @for (h of hg.headers; track h.id) {
                <th kjTableHeader [kjHeader]="h" scope="col">{{ h.id }}</th>
              }
            </tr>
          }
        </thead>
        <tbody></tbody>
      </table>`,
  })
  class NoSortTableComponent {
    columns: ColumnDef<User>[] = [
      { accessorKey: 'name', header: 'Name', enableSorting: false },
    ];
    data: User[] = [{ name: 'Alice', age: 30 }];
  }

  const { container } = await render(NoSortTableComponent);
  const th = container.querySelector('th')!;
  expect(th.style.cursor).not.toBe('pointer');
  expect(th.hasAttribute('data-sort')).toBe(false);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```
pnpm test -- --filter @kouji-ui/core
```
Expected: the new test fails (th.style.cursor IS 'pointer' currently).

- [ ] **Step 3: Fix KjTableHeaderDirective**

Replace the entire `KjTableHeaderDirective` class (lines 84–121) in `packages/core/src/table/table.directive.ts`:

```typescript
/**
 * Marks a `<th>` as a sortable column header. Sets `aria-sort` based on TanStack sort state.
 * Clicking toggles sort direction only when the column has sorting enabled.
 * If `enableSorting: false` is set on the column def, the header renders as plain text.
 *
 * @example
 * ```html
 * <th kjTableHeader [kjHeader]="header" scope="col">Name</th>
 * ```
 * @category Core/Data/Table
 */
@Directive({
  selector: '[kjTableHeader]',
  standalone: true,
  host: {
    '[style.cursor]': 'canSort() ? "pointer" : null',
    '[attr.aria-sort]': 'canSort() ? ariaSort() : null',
    '[attr.data-sort]': 'canSort() ? sortDir() : null',
    '(click)': 'onHeaderClick()',
  },
})
export class KjTableHeaderDirective<TData extends RowData = unknown> {
  /** The TanStack header object for this column. Pass from the table's getHeaderGroups(). */
  kjHeader = input<ReturnType<Table<TData>['getHeaderGroups']>[0]['headers'][0] | undefined>(undefined);

  /** Whether this column supports sorting, derived from TanStack column state. */
  readonly canSort = computed(() => this.kjHeader()?.column.getCanSort() ?? false);

  /** Current sort direction, or null when unsorted. */
  readonly sortDir = computed((): KjSortDirection | null => {
    const h = this.kjHeader();
    if (!h) return null;
    const sorted = h.column.getIsSorted();
    if (sorted === 'asc') return 'asc';
    if (sorted === 'desc') return 'desc';
    return null;
  });

  /** ARIA sort attribute value derived from sort direction. */
  readonly ariaSort = computed(() => {
    const d = this.sortDir();
    if (d === 'asc') return 'ascending';
    if (d === 'desc') return 'descending';
    return null;
  });

  onHeaderClick(): void {
    if (this.canSort()) this.kjHeader()?.column.toggleSorting();
  }
}
```

Also update the `KjSortDirection` type at the bottom of the file:

```typescript
/** Sort direction for table columns. */
export type KjSortDirection = 'asc' | 'desc';
```

- [ ] **Step 4: Run all tests**

```
pnpm test -- --filter @kouji-ui/core
```
Expected: all tests pass including the new one.

- [ ] **Step 5: Verify TypeScript compiles**

```
pnpm --filter @kouji-ui/core exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/table/table.directive.ts packages/core/src/table/table.directive.spec.ts
git commit -m "fix(table): KjTableHeaderDirective respects getCanSort(), null data-sort when unsorted"
```

---

## Task 2: Create DocsTableComponent

**Files:**
- Create: `apps/docs/src/app/components/docs-table/docs-table.ts`
- Create: `apps/docs/src/app/components/docs-table/docs-table.html`
- Create: `apps/docs/src/app/components/docs-table/docs-table.css`

- [ ] **Step 1: Create `docs-table.ts`**

```typescript
import { Component, computed, input } from '@angular/core';
import { createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { KjTableDirective, KjTableHeaderDirective } from '@kouji-ui/core';

export interface DocsTableColumn {
  key: string;
  header: string;
}

@Component({
  selector: 'docs-table',
  standalone: true,
  imports: [KjTableDirective, KjTableHeaderDirective],
  templateUrl: './docs-table.html',
  styleUrl: './docs-table.css',
})
export class DocsTableComponent {
  readonly columns = input.required<DocsTableColumn[]>();
  readonly rows    = input.required<Record<string, unknown>[]>();

  private readonly ch = createColumnHelper<Record<string, unknown>>();

  readonly columnDefs = computed((): ColumnDef<Record<string, unknown>>[] =>
    this.columns().map(col =>
      this.ch.accessor(row => row[col.key], {
        id: col.key,
        header: col.header,
        enableSorting: false,
      })
    )
  );
}
```

- [ ] **Step 2: Create `docs-table.html`**

```html
<div class="table-wrap">
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
                {{ cell.getValue() }}<span class="required-mark" aria-label="required">*</span>
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
    <p class="empty-state">No entries.</p>
  }
</div>
```

- [ ] **Step 3: Create `docs-table.css`**

```css
.table-wrap {
  border: 1px solid var(--border);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', monospace;
}

thead {
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
}

th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 400;
  white-space: nowrap;
  border-right: 1px solid var(--border);
}
th:last-child { border-right: none; }

td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  border-right: 1px solid var(--border);
  color: var(--text-secondary);
  vertical-align: top;
  line-height: 1.5;
}
td:last-child { border-right: none; }
tr:last-child td { border-bottom: none; }

td[data-col="name"],
td[data-col="type"],
td[data-col="defaultValue"] {
  color: var(--text);
  white-space: nowrap;
}

td[data-col="description"] {
  color: var(--text-secondary);
  white-space: normal;
  max-width: 36ch;
}

.required-mark {
  color: var(--accent);
  margin-left: 1px;
  font-size: 0.875em;
}

.empty-state {
  padding: 1rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```
pnpm --filter docs exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/app/components/docs-table/
git commit -m "feat(docs): DocsTableComponent using KjTableDirective"
```

---

## Task 3: Integrate DocsTable into component-doc

**Files:**
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.ts`
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.html`
- Modify: `apps/docs/src/app/pages/component-doc/component-doc.css`

- [ ] **Step 1: Update `component-doc.ts`**

Replace the full file:

```typescript
import { ApplicationRef, Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, filter, take } from 'rxjs/operators';
import { DocsService } from '../../services/docs.service';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { CodePreviewComponent } from '../../components/code-preview/code-preview';
import { CodeEditorComponent } from '../../components/code-editor/code-editor';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';
import { DocsTableComponent, type DocsTableColumn } from '../../components/docs-table/docs-table';

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [
    RouterLink,
    DocsSidebarComponent,
    CodePreviewComponent,
    CodeEditorComponent,
    PageTocDirective,
    PageTocComponent,
    DocsTableComponent,
  ],
  templateUrl: './component-doc.html',
  styleUrl: './component-doc.css',
})
export class ComponentDocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);
  private readonly appRef = inject(ApplicationRef);

  protected readonly component = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        this.docs.loadManifest().pipe(map(() => this.docs.getComponent(params.get('slug') ?? ''))),
      ),
    ),
  );

  protected readonly sidebar = viewChild.required<DocsSidebarComponent>('sidebar');
  private readonly pageToc = viewChild(PageTocDirective);

  protected readonly inputColumns: DocsTableColumn[] = [
    { key: 'name',         header: 'Name'        },
    { key: 'type',         header: 'Type'        },
    { key: 'defaultValue', header: 'Default'     },
    { key: 'description',  header: 'Description' },
  ];

  constructor() {
    toObservable(this.component).pipe(
      filter(Boolean),
      switchMap(() => this.appRef.isStable.pipe(filter(Boolean), take(1))),
    ).subscribe(() => this.pageToc()?.refresh());
  }
}
```

- [ ] **Step 2: Replace inputs table in `component-doc.html`**

Find and replace this block in `component-doc.html`:

```html
          @if (directive.inputs.length) {
            <div class="inputs-block">
              <h3 class="block-title">Inputs</h3>
              <div class="inputs-table">
                <div class="inputs-header">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Default</span>
                  <span>Description</span>
                </div>
                @for (inp of directive.inputs; track inp.name) {
                  <div class="input-row">
                    <code class="inp-name">
                      {{ inp.name }}
                      @if (inp.required) {<span class="required">*</span>}
                    </code>
                    <code class="inp-type">{{ inp.type }}</code>
                    <code class="inp-default">{{ inp.defaultValue ?? '—' }}</code>
                    <span class="inp-desc">{{ inp.description || '—' }}</span>
                  </div>
                }
              </div>
              <p class="required-note">* required</p>
            </div>
          }
```

Replace with:

```html
          @if (directive.inputs.length) {
            <div class="inputs-block">
              <h3 class="block-title">Inputs</h3>
              <docs-table [columns]="inputColumns" [rows]="directive.inputs" />
              <p class="required-note">* required</p>
            </div>
          }
```

- [ ] **Step 3: Remove old inputs table CSS from `component-doc.css`**

Remove these CSS rules (they are no longer needed):

```css
.inputs-table {
  border: 1px solid var(--border);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  overflow-x: auto;
}

.inputs-header, .input-row {
  display: grid;
  grid-template-columns: max-content max-content max-content 1fr;
  gap: 0;
}

.inputs-header {
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.inputs-header span, .input-row > * {
  padding: 0.75rem 1rem;
  border-right: 1px solid var(--border);
}
.inputs-header span:last-child, .input-row > *:last-child { border-right: none; }

.input-row { border-bottom: 1px solid var(--border-subtle); }
.input-row:last-child { border-bottom: none; }

.inp-name { color: var(--text); }
.required { color: var(--accent); }
.inp-type { color: #888; }
.inp-default { color: var(--text-secondary); }
.inp-desc { color: var(--text-secondary); line-height: 1.5; }
.required-note { font-size: 0.65rem; color: var(--text-muted); margin-top: 0.25rem; }
```

Also remove the mobile override that targeted these:

```css
  .inputs-header, .input-row {
    grid-template-columns: max-content max-content max-content 1fr;
  }
```

Keep `.inputs-block { margin-bottom: 2rem; }` and `.required-note` styles since they are still used.

- [ ] **Step 4: Verify TypeScript compiles**

```
pnpm --filter docs exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Visual check**

Start the dev server from workspace root `C:\Users\narut\Desktop\projects\kouji`:
```
pnpm --filter docs dev
```
Navigate to `http://localhost:4200/docs/components/button`. Verify:
- The inputs table renders with columns: Name / Type / Default / Description
- Required inputs show `*` in red/accent after the name
- Non-sortable headers have no pointer cursor
- Table is horizontally scrollable when content overflows

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/app/pages/component-doc/component-doc.ts \
        apps/docs/src/app/pages/component-doc/component-doc.html \
        apps/docs/src/app/pages/component-doc/component-doc.css
git commit -m "feat(docs): replace hand-rolled inputs table with DocsTableComponent"
```
