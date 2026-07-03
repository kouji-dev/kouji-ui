import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  Type,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  contentChild,
  contentChildren,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { ResourceRef } from '@angular/core';
import {
  KjTable,
  KjTableHeader,
  KjTableRow,
  KjTableCell,
  KjTableKeyboardNav,
  KjIconDirective,
  KJ_TABLE_STORAGE,
  type KjColumnMeta,
  type KjResourceResult,
  type KjStorageAdapter,
  type KjTableState,
} from '@kouji-ui/core';
import type { Cell, Column, Header, Row, RowData } from '@tanstack/angular-table';
import { KjTableVirtual } from './table-virtual';
import { KjCellTemplateDirective } from './table-cell-template';
import { KjCheckboxComponent } from '../checkbox/checkbox';
import {
  KjBooleanEditor,
  KjDateEditor,
  KjNumberEditor,
  KjSelectEditor,
  KjTextEditor,
} from './table-editors';
import {
  KjDateFilter,
  KjNumberFilter,
  KjSelectFilter,
  KjTextFilter,
} from './table-filters';
import { KjCellEditorOutlet } from './table-cell-editor-outlet';
import { KjFilterCellOutlet } from './table-filter-outlet';

/** Cell-edit payload emitted by `(cellEdit)`. */
export interface KjCellEditEvent<TData> {
  readonly row: TData;
  readonly columnId: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

/** Row click payload. */
export interface KjRowClickEvent<TData> {
  readonly row: TData;
  readonly event: MouseEvent;
}

const VIRTUAL_AUTO_THRESHOLD = 200;

/** Lookup of column type → built-in editor component. */
const BUILTIN_EDITORS: Readonly<Record<string, Type<unknown>>> = {
  text: KjTextEditor,
  number: KjNumberEditor,
  date: KjDateEditor,
  boolean: KjBooleanEditor,
  select: KjSelectEditor,
};

/** Lookup of column type → built-in filter UI. */
const BUILTIN_FILTERS: Readonly<Record<string, Type<unknown>>> = {
  text: KjTextFilter,
  number: KjNumberFilter,
  date: KjDateFilter,
  select: KjSelectFilter,
};

/**
 * Themed root data table built on top of the headless `@kouji-ui/core` table
 * directives. Wires TanStack-backed `<table>` rendering, ARIA grid semantics,
 * density / variant tokens, content projection slots (toolbar, side-panel,
 * empty, error, loading, row-expansion), persistence, virtualization,
 * resource-backed data, inline editing, and column resizing.
 *
 * Three data modes:
 * - **Static**: pass `kjData` as a plain array.
 * - **Signal**: pass a signal of rows via `kjData`.
 * - **Resource**: pass a `ResourceRef<KjResourceResult<T>>` via `kjResource`;
 *   `kjData` is ignored and loading / error are derived from the resource.
 *
 * @example
 * ```html
 * <kj-table [kjData]="rows()" [kjColumns]="cols" kjDensity="compact" />
 * ```
 *
 * @doc-example Default [full]
 *   The smallest possible `<kj-table>` — three columns, five rows.
 *   @doc-file table.example.ts
 * @doc-example Usage [full]
 *   Full host API: density toggle, bordered variant, toolbar / pagination /
 *   status-bar slots projected.
 *   @doc-file table.usage.example.ts
 * @doc-example Sortable [full]
 *   Click a header to sort; click again to flip direction; third click clears.
 *   Shift-click a second header to add a secondary sort.
 *   @doc-file table.sortable.example.ts
 * @doc-example Filterable [full]
 *   `[kjEnableFilters]="true"` renders a filter row under each header. Built-in
 *   text / number / date / select filters pick by `kjType`.
 *   @doc-file table.filterable.example.ts
 * @doc-example Selection [full]
 *   Multi-row selection with status-bar count + bulk-action slot.
 *   @doc-file table.selection.example.ts
 * @doc-example Inline editing [full]
 *   Double-click a cell to mount the matching editor; Enter commits, Escape
 *   cancels. Listen to `(cellEdit)` and persist yourself.
 *   @doc-file table.editable.example.ts
 * @doc-example Column visibility [full]
 *   Show / hide columns via the toolbar's visibility menu.
 *   @doc-file table.column-visibility.example.ts
 * @doc-example Column resize [full]
 *   `[kjEnableResize]="true"` puts a grab handle on each `<th>` border.
 *   @doc-file table.column-resize.example.ts
 * @doc-example Column pinning [full]
 *   `kjPin: 'left' | 'right'` on a column meta pins it. Unpinned columns
 *   scroll horizontally between the pinned edges.
 *   @doc-file table.column-pinning.example.ts
 * @doc-example Row pinning [full]
 *   Pin rows top / bottom via TanStack's row-pinning state.
 *   @doc-file table.row-pinning.example.ts
 * @doc-example Grouping [full]
 *   Group by a column; toggle group rows to collapse / expand.
 *   @doc-file table.grouping.example.ts
 * @doc-example Master / detail [full]
 *   `<ng-template #kjRowExpansion let-row>` renders below the expanded row.
 *   @doc-file table.master-detail.example.ts
 * @doc-example Virtualized [full]
 *   `[kjVirtual]="true"` (or `'auto'` past 200 rows) windows the body via
 *   `@tanstack/virtual-core`.
 *   @doc-file table.virtualized.example.ts
 * @doc-example Density [full]
 *   `compact` / `standard` / `comfortable` adjust row padding.
 *   @doc-file table.density.example.ts
 * @doc-example Theming [full]
 *   `bordered` / `striped` / `clean` variants for visual weight.
 *   @doc-file table.theming.example.ts
 * @doc-example Server mode [full]
 *   `kjTableResource()` wires the table state into an async loader; pagination
 *   and filtering round-trip through your endpoint.
 *   @doc-file table.server-mode.example.ts
 * @doc-example Persistence [full]
 *   `[kjStorageKey]` + a `KjStorageAdapter` round-trip sort / filter / pinning
 *   / visibility / density through reload.
 *   @doc-file table.persistence.example.ts
 * @doc-example Export [full]
 *   CSV / JSON / clipboard export via `data-table-export` utilities, wired to
 *   the toolbar's export menu.
 *   @doc-file table.export.example.ts
 * @doc-example Empty and error [full]
 *   Project `[kjEmpty]` / `[kjError]` slots to override the defaults.
 *   @doc-file table.empty-and-error.example.ts
 * @doc-example Keyboard [full]
 *   Arrow / Home / End / Ctrl+Home/End / PageUp/Down / F2 / Enter / Esc /
 *   Space / Cmd+A — full WAI-ARIA Grid pattern.
 *   @doc-file table.keyboard.example.ts
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name table
 * @doc-is-main
 * @doc-description Themed data table built on TanStack — slots for toolbar, side panel, empty/error/loading; inline editing, filtering, resize, persistence, virtualization, resource-backed data.
 */
@Component({
  selector: 'kj-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `hostDirectives: [KjTable]` hoists the core directive (and its
  // `KJ_TABLE` provider) onto the `<kj-table>` host element so projected
  // content — `<kj-table-toolbar>`, `<kj-table-status-bar>`,
  // `<kj-table-pagination>` — can `inject(KJ_TABLE)` from its element
  // injector. The aliased inputs expose the directive surface under
  // wrapper-friendly names (`kjColumns`, `kjData`, `kjGetRowId`).
  hostDirectives: [
    {
      directive: KjTable,
      inputs: ['kjTable: kjColumns', 'kjTableData: kjData', 'kjGetRowId'],
    },
  ],
  imports: [
    KjTableHeader,
    KjTableRow,
    KjTableCell,
    KjTableKeyboardNav,
    KjTableVirtual,
    KjIconDirective,
    KjCheckboxComponent,
    KjCellEditorOutlet,
    KjFilterCellOutlet,
    NgTemplateOutlet,
  ],
  host: {
    // Read density from the hosted directive's signal — both the wrapper's
    // `kjDensity` input AND the toolbar's density toggle write through to
    // `KjTable.density` via `setState({ density })`, so a single source of
    // truth drives the `data-density` host attribute.
    '[attr.data-density]': 't.state.density()',
    '[attr.data-variant]': 'kjVariant()',
    '[attr.data-loading]': 'isLoading() ? "" : null',
    '[attr.data-error]': 'hasError() ? "" : null',
  },
  template: `
    <div class="kj-table-wrapper">
      <!-- Toolbar projection: matches either an explicit [kjToolbar] marker
           OR the styled <kj-table-toolbar> element directly, so users don't
           have to remember the marker attribute. -->
      <ng-content select="kj-table-toolbar, [kjToolbar]" />

      <div class="kj-table-body">
        <table kjTableKeyboardNav
          role="grid"
          [attr.aria-rowcount]="aria.rowCount()"
          [attr.aria-colcount]="aria.colCount()"
        >
          <thead>
            @for (g of t.table().getHeaderGroups(); track g.id) {
              <tr role="row">
                @if (showSelectionColumn()) {
                  <th scope="col" class="kj-table-select-cell">
                    @if (kjSelectionMode() === 'multi') {
                      <kj-checkbox
                        [checked]="t.table().getIsAllPageRowsSelected()"
                        [indeterminate]="t.table().getIsSomePageRowsSelected()"
                        (checkedChange)="onSelectAll($event)"
                        kjAriaLabel="Select all rows"
                      />
                    }
                  </th>
                }
                @for (h of g.headers; track h.id) {
                  <th kjTableHeader
                    [kjHeader]="h"
                    scope="col"
                    [style.width.px]="kjEnableResize() ? h.getSize() : null"
                    [attr.data-pin]="headerPin(h)"
                    [attr.data-resizing]="h.column.getIsResizing?.() ? '' : null"
                    [style.--kj-resize-delta.px]="t.columnSizingInfo().deltaOffset ?? 0"
                  >
                    {{ h.column.columnDef.header }}
                    @if (h.column.getCanSort?.()) {
                      <i
                        class="kj-table-sort-indicator"
                        kjIconSize="sm"
                        aria-hidden="true"
                        [kjIcon]="sortIcon(h)"
                      ></i>
                    }
                    @if (kjEnableResize() && h.column.getCanResize?.()) {
                      <span
                        class="kj-table-resize-handle"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize column"
                        (mousedown)="h.getResizeHandler()($event)"
                        (touchstart)="h.getResizeHandler()($event)"
                      ></span>
                    }
                  </th>
                }
              </tr>
            }
            @if (kjEnableFilters()) {
              <tr role="row" class="kj-table-filter-row">
                @if (showSelectionColumn()) {
                  <th scope="col" class="kj-table-select-cell"></th>
                }
                @for (g of t.table().getHeaderGroups(); track g.id) {
                  @for (h of g.headers; track h.id) {
                    <th scope="col" class="kj-table-filter-cell">
                      @if (filterTypeFor(h.column); as ft) {
                        <span
                          kjFilterCell
                          class="kj-table-filter-anchor"
                          [kjColumn]="h.column"
                          [kjFilter]="filterRendererFor(h.column, ft)"
                        ></span>
                      }
                    </th>
                  }
                }
              </tr>
            }
          </thead>

          @if (kjEnableRowPinning() && t.table().getTopRows().length > 0) {
            <tbody class="kj-table-tbody-pinned" data-pin="top">
              @for (r of t.table().getTopRows(); track r.id) {
                <tr kjTableRow [kjRow]="r"
                    (click)="onRowClick(r, $event)"
                    (dblclick)="onRowDblClick(r, $event)">
                  @if (showSelectionColumn()) {
                    <td class="kj-table-select-cell"
                        (mousedown)="rememberClickModifiers($event)"
                        (click)="$event.stopPropagation()">
                      <kj-checkbox
                        [checked]="r.getIsSelected()"
                        (checkedChange)="onRowCheckboxToggle(r)"
                        kjAriaLabel="Select row"
                      />
                    </td>
                  }
                  @for (c of r.getVisibleCells(); track c.id) {
                    <td kjTableCell [kjCell]="c" tabindex="-1"
                        [class.kj-table-cell--editing]="isEditing(c)"
                        (click)="onCellClick(c, $event)"
                        (dblclick)="onCellDblClick(c, $event)"
                        (keydown)="onCellKeydown(c, $event)">
                      @if (isEditing(c)) {
                        <span class="kj-table-cell-ghost" aria-hidden="true">{{ c.getValue() }}</span>
                        <span
                          kjCellEditorOutlet
                          class="kj-table-editor-anchor"
                          [kjEditor]="editorTypeFor(c)"
                          [kjValue]="c.getValue()"
                          [kjMeta]="editorMetaFor(c)"
                          (commit)="onEditorCommit(c, $event)"
                          (editCancel)="onEditorCancel()"
                        ></span>
                      } @else {
                        @if (cellTpl(c); as tpl) {
                          <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original, value: c.getValue(), cell: c }" />
                        } @else {
                          {{ c.getValue() }}
                        }
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          }

          @if (shouldVirtualize()) {
            <tbody
              kjTableVirtual
              [kjCount]="centerRows().length"
              [kjEstimateSize]="kjEstimatedRowSize()"
              #v="kjTableVirtual"
            >
              @if (v.paddingTop() > 0) {
                <tr aria-hidden="true">
                  <td [attr.colspan]="aria.colCount()" [style.height.px]="v.paddingTop()"></td>
                </tr>
              }
              @for (vr of v.virtualRows(); track vr.key) {
                @if (centerRows()[vr.index]; as r) {
                  <tr kjTableRow [kjRow]="r"
                      (click)="onRowClick(r, $event)"
                      (dblclick)="onRowDblClick(r, $event)">
                    @if (showSelectionColumn()) {
                      <td class="kj-table-select-cell"
                          (mousedown)="rememberClickModifiers($event)"
                          (click)="$event.stopPropagation()">
                        <kj-checkbox
                          [checked]="r.getIsSelected()"
                          (checkedChange)="onRowCheckboxToggle(r)"
                          kjAriaLabel="Select row"
                        />
                      </td>
                    }
                    @for (c of r.getVisibleCells(); track c.id) {
                      <td kjTableCell [kjCell]="c" tabindex="-1"
                          [class.kj-table-cell--editing]="isEditing(c)"
                          [style.width.px]="kjEnableResize() ? c.column.getSize() : null"
                          (click)="onCellClick(c, $event)"
                          (dblclick)="onCellDblClick(c, $event)"
                          (keydown)="onCellKeydown(c, $event)">
                        @if (isEditing(c)) {
                          <span class="kj-table-cell-ghost" aria-hidden="true">{{ c.getValue() }}</span>
                          <span
                            kjCellEditorOutlet
                            class="kj-table-editor-anchor"
                            [kjEditor]="editorTypeFor(c)"
                            [kjValue]="c.getValue()"
                            [kjMeta]="editorMetaFor(c)"
                            (commit)="onEditorCommit(c, $event)"
                            (editCancel)="onEditorCancel()"
                          ></span>
                        } @else {
                          @if (cellTpl(c); as tpl) {
                            <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original, value: c.getValue(), cell: c }" />
                          } @else {
                            {{ c.getValue() }}
                          }
                        }
                      </td>
                    }
                  </tr>
                  @if (kjRowExpansionTpl() && r.getIsExpanded?.()) {
                    <tr class="kj-table-expansion-row">
                      <td [attr.colspan]="aria.colCount()">
                        <ng-container
                          [ngTemplateOutlet]="kjRowExpansionTpl()!"
                          [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original }"
                        />
                      </td>
                    </tr>
                  }
                }
              }
              @if (v.paddingBottom() > 0) {
                <tr aria-hidden="true">
                  <td [attr.colspan]="aria.colCount()" [style.height.px]="v.paddingBottom()"></td>
                </tr>
              }
            </tbody>
          } @else {
            <tbody>
              @for (r of centerRows(); track r.id) {
                <tr kjTableRow [kjRow]="r"
                    [attr.data-row-grouped]="r.getIsGrouped?.() ? '' : null"
                    (click)="onRowClick(r, $event)"
                    (dblclick)="onRowDblClick(r, $event)">
                  @if (showSelectionColumn()) {
                    <td class="kj-table-select-cell"
                        (mousedown)="rememberClickModifiers($event)"
                        (click)="$event.stopPropagation()">
                      <kj-checkbox
                        [checked]="r.getIsSelected()"
                        (checkedChange)="onRowCheckboxToggle(r)"
                        kjAriaLabel="Select row"
                      />
                    </td>
                  }
                  @for (c of r.getVisibleCells(); track c.id) {
                    <td kjTableCell [kjCell]="c" tabindex="-1"
                        [class.kj-table-cell--editing]="isEditing(c)"
                        [style.width.px]="kjEnableResize() ? c.column.getSize() : null"
                        (click)="onCellClick(c, $event)"
                        (dblclick)="onCellDblClick(c, $event)"
                        (keydown)="onCellKeydown(c, $event)">
                      @if (isEditing(c)) {
                        <span class="kj-table-cell-ghost" aria-hidden="true">{{ c.getValue() }}</span>
                        <span
                          kjCellEditorOutlet
                          class="kj-table-editor-anchor"
                          [kjEditor]="editorTypeFor(c)"
                          [kjValue]="c.getValue()"
                          [kjMeta]="editorMetaFor(c)"
                          (commit)="onEditorCommit(c, $event)"
                          (editCancel)="onEditorCancel()"
                        ></span>
                      } @else if (c.getIsGrouped?.()) {
                        <button type="button"
                                class="kj-table-group-toggle"
                                [attr.aria-expanded]="r.getIsExpanded?.() ? 'true' : 'false'"
                                (click)="onGroupToggle(r, $event)">
                          <span class="kj-table-group-toggle__chevron" aria-hidden="true">›</span>
                          {{ c.getValue() }}
                          <span class="kj-table-group-toggle__count">({{ r.subRows?.length ?? 0 }})</span>
                        </button>
                      } @else if (c.getIsAggregated?.()) {
                        {{ c.renderValue() }}
                      } @else if (c.getIsPlaceholder?.()) {
                      } @else {
                        @if (cellTpl(c); as tpl) {
                          <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original, value: c.getValue(), cell: c }" />
                        } @else {
                          {{ c.getValue() }}
                        }
                      }
                    </td>
                  }
                </tr>
                @if (kjRowExpansionTpl() && r.getIsExpanded?.() && !r.getIsGrouped?.()) {
                  <tr class="kj-table-expansion-row">
                    <td [attr.colspan]="aria.colCount()">
                      <ng-container
                        [ngTemplateOutlet]="kjRowExpansionTpl()!"
                        [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original }"
                      />
                    </td>
                  </tr>
                }
              }
            </tbody>
          }

          @if (kjEnableRowPinning() && t.table().getBottomRows().length > 0) {
            <tbody class="kj-table-tbody-pinned" data-pin="bottom">
              @for (r of t.table().getBottomRows(); track r.id) {
                <tr kjTableRow [kjRow]="r"
                    (click)="onRowClick(r, $event)"
                    (dblclick)="onRowDblClick(r, $event)">
                  @if (showSelectionColumn()) {
                    <td class="kj-table-select-cell"
                        (mousedown)="rememberClickModifiers($event)"
                        (click)="$event.stopPropagation()">
                      <kj-checkbox
                        [checked]="r.getIsSelected()"
                        (checkedChange)="onRowCheckboxToggle(r)"
                        kjAriaLabel="Select row"
                      />
                    </td>
                  }
                  @for (c of r.getVisibleCells(); track c.id) {
                    <td kjTableCell [kjCell]="c" tabindex="-1">
                      @if (cellTpl(c); as tpl) {
                        <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original, value: c.getValue(), cell: c }" />
                      } @else {
                        {{ c.getValue() }}
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          }
        </table>

        <ng-content select="[kjSidePanel]" />
      </div>

      @if (showEmpty()) {
        <div class="kj-table-empty" role="status">
          <ng-content select="[kjEmpty]" />
        </div>
      }
      @if (hasError()) {
        <div class="kj-table-error" role="alert">
          <ng-content select="[kjError]" />
        </div>
      }
      @if (isLoading()) {
        <div class="kj-table-loading"
             aria-live="polite"
             aria-busy="true"
             [attr.data-has-rows]="effectiveData().length > 0 ? '' : null">
          <ng-content select="[kjLoading]">
            <span class="kj-table-loading-fallback">Loading…</span>
          </ng-content>
        </div>
      }

      <ng-content />
    </div>
  `,
  styleUrl: './table.css',
  encapsulation: ViewEncapsulation.Emulated,
})
export class KjTableComponent<TData extends RowData = unknown> {
  // ── Data ────────────────────────────────────────────────────────────────
  // `kjColumns`, `kjData`, `kjGetRowId` are exposed via `hostDirectives` input
  // forwarding (see the `@Component` metadata) — bindings on `<kj-table>`
  // flow straight into the hosted `KjTable` directive. We read them back via
  // the injected directive instance (`this.t`) when the wrapper needs them.

  /**
   * Resource-backed data source. When set, rows come from
   * `kjResource.value().rows`, `kjLoading` is derived from `isLoading()`, and
   * the error slot renders when `error()` is non-null. The wrapper writes
   * the resolved rows into the hosted `KjTable.kjTableData` model — the
   * underlying TanStack instance always sees a single rows source.
   */
  readonly kjResource = input<ResourceRef<KjResourceResult<TData> | undefined> | null>(null);

  // ── Theming ─────────────────────────────────────────────────────────────
  readonly kjDensity = input<'compact' | 'standard' | 'comfortable'>('standard');
  readonly kjVariant = input<'bordered' | 'striped' | 'clean'>('bordered');
  /** External "I'm loading" flag, ORed with the resource's `isLoading()`. */
  readonly kjLoading = input(false);

  // ── Selection ───────────────────────────────────────────────────────────
  readonly kjSelection = model<Set<string> | string | null>(null);
  readonly kjSelectionMode = input<'single' | 'multi' | 'none'>('none');
  /**
   * Whether the wrapper auto-renders a leading checkbox column. Defaults to
   * `true` whenever selection is enabled; set `false` to drive selection
   * purely from row clicks / external state without the column.
   */
  readonly kjShowSelectionColumn = input<boolean>(true);

  // ── Persistence ─────────────────────────────────────────────────────────
  readonly kjStorageKey = input<string | null>(null);
  readonly kjStorageAdapter = input<KjStorageAdapter | null>(null);

  // ── Virtualization ──────────────────────────────────────────────────────
  readonly kjVirtual = input<boolean | 'auto'>('auto');
  readonly kjEstimatedRowSize = input<number>(36);

  // ── Feature toggles ─────────────────────────────────────────────────────
  readonly kjEnableFilters = input<boolean>(false);
  readonly kjEnableResize = input<boolean>(false);
  readonly kjEnableRowPinning = input<boolean>(false);
  readonly kjEditOnDoubleClick = input<boolean>(true);

  // ── Row expansion template ─────────────────────────────────────────────
  /** Template for master-detail row expansion. Receives `$implicit = row`. */
  readonly kjRowExpansionTpl = contentChild<TemplateRef<unknown>>('kjRowExpansion');

  /** Custom cell templates declared as `ng-template[kjCellTemplate]` content. */
  private readonly cellTemplates = contentChildren(KjCellTemplateDirective);

  /** Resolve the registered template for a cell's column, if any. */
  protected cellTpl(cell: Cell<TData, unknown>): TemplateRef<unknown> | null {
    for (const t of this.cellTemplates()) {
      if (t.kjCellTemplate() === cell.column.id) return t.template;
    }
    return null;
  }

  // ── Outputs ─────────────────────────────────────────────────────────────
  readonly cellEdit = output<KjCellEditEvent<TData>>();
  readonly stateChange = output<KjTableState>();
  readonly rowClick = output<KjRowClickEvent<TData>>();
  readonly rowDoubleClick = output<KjRowClickEvent<TData>>();

  // ── Refs ────────────────────────────────────────────────────────────────
  /**
   * The hosted `KjTable` directive instance. Exposed under the legacy
   * `tableRef()` API for examples that drive the table imperatively
   * (`tableRef().setState(...)`, `tableRef().setRowPinning(...)`).
   *
   * `t` is the template-side alias for the same instance, used everywhere
   * the template needs the TanStack table proxy (`t.table().getRowModel()`).
   */
  protected readonly t = inject(KjTable) as unknown as KjTable<TData>;
  readonly tableRef = (): KjTable<TData> => this.t;

  // ── Internal state ──────────────────────────────────────────────────────
  private readonly tokenStorage = inject(KJ_TABLE_STORAGE, { optional: true });

  /** Tracks the cell currently in edit mode by row+column id. */
  protected readonly editingCell = signal<{ rowId: string; columnId: string } | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────
  /**
   * Effective rows driving TanStack:
   *   - `kjResource` set → unwrap `resource.value().rows`
   *   - otherwise → use the hosted directive's `kjTableData` model
   *     (fed by `[kjData]` on the host).
   */
  protected readonly effectiveData = computed<TData[]>(() => {
    const res = this.kjResource();
    if (res) {
      // Skip `.value()` when the resource is in error / loading — both throw
      // or return stale data. The error / loading panes render instead, and
      // the table model holds whatever the write-through effect last set.
      if (res.error() != null || res.isLoading()) return [];
      const v = res.value();
      const rows = v?.rows;
      return rows ? Array.from(rows) : [];
    }
    return this.t.kjTableData();
  });

  /**
   * All center (non-pinned) rows from TanStack.
   *
   * When virtualization is active we skip pagination — the virtualizer is the
   * windowing mechanism, so feeding it a 25-row page (TanStack's default) makes
   * a 10k dataset look like 25 rows that can't scroll. `getPrePaginationRowModel`
   * keeps sort + filter applied but returns the full slice.
   */
  protected readonly centerRows = computed<Row<TData>[]>(() => {
    const tbl = this.t.table();
    if (this.kjEnableRowPinning()) return tbl.getCenterRows();
    return this.shouldVirtualize()
      ? tbl.getPrePaginationRowModel().rows
      : tbl.getRowModel().rows;
  });

  /**
   * Whether the leading checkbox column should render. Auto-enables when
   * selection mode is non-`none` AND the user hasn't opted out.
   */
  protected readonly showSelectionColumn = computed<boolean>(
    () => this.kjSelectionMode() !== 'none' && this.kjShowSelectionColumn(),
  );

  /**
   * Captured at mousedown on a select-cell so the subsequent checkbox
   * `checkedChange` can branch on shift / ctrl/cmd without losing the modifier
   * state (the keyboard modifiers are only on the originating MouseEvent;
   * the change event from kj-checkbox doesn't carry them).
   */
  private lastClickShift = false;
  private lastAnchorRowId: string | null = null;

  /** True when the active resource is loading OR `kjLoading` is set. */
  protected readonly isLoading = computed<boolean>(() => {
    if (this.kjLoading()) return true;
    const res = this.kjResource();
    return res ? res.isLoading() : false;
  });

  /** True when the active resource is in error state. */
  protected readonly hasError = computed<boolean>(() => {
    const res = this.kjResource();
    return res ? res.error() != null : false;
  });

  /** True when there are no rows AND we are not loading or errored. */
  protected readonly showEmpty = computed<boolean>(
    () => this.effectiveData().length === 0 && !this.isLoading() && !this.hasError(),
  );

  /**
   * Whether row virtualization should be enabled. Counts against the
   * pre-pagination row model so `'auto'` flips on for large datasets that
   * would otherwise be split across paginated pages.
   */
  protected readonly shouldVirtualize = computed<boolean>(() => {
    const mode = this.kjVirtual();
    if (mode === true) return true;
    if (mode === false) return false;
    return this.t.table().getPrePaginationRowModel().rows.length > VIRTUAL_AUTO_THRESHOLD;
  });

  protected readonly aria = {
    rowCount: computed(() => this.effectiveData().length + 1),
    colCount: computed(() => {
      const cols = this.t.kjTable();
      // Approximate: flatten one level of column groups for ARIA.
      let n = 0;
      for (const c of cols) {
        const sub = (c as { columns?: unknown[] }).columns;
        n += Array.isArray(sub) ? sub.length : 1;
      }
      return n;
    }),
  };

  constructor() {
    // Wrapper's `kjDensity` input → hosted directive's density state. Both
    // the user's external binding AND the toolbar's density toggle write
    // into `KjTable.density` via `setState`, so a single source of truth
    // backs the host's `data-density` attribute and the row-padding CSS.
    //
    // The internal `t.density()` read is wrapped in `untracked` so the
    // effect only fires on `kjDensity` input changes — without that, a
    // toolbar click would update `t.density`, re-trigger this effect, and
    // get clobbered back to the input value (feedback loop).
    effect(() => {
      const next = this.kjDensity();
      untracked(() => {
        if (this.t.state.density() !== next) this.t.setState({ density: next });
      });
    });

    // Pipe resource rows into the hosted KjTable.kjTableData model so the
    // single TanStack instance always sees one rows source. When kjResource
    // is null the user's `[kjData]` binding flows through unchanged.
    //
    // `resource.value()` throws when the resource is in an error state
    // (Angular's contract — read errors live on `.error()`). We guard on
    // both `error()` and `isLoading()` so the error / loading panes own the
    // UX while the table model keeps the last-known rows empty.
    effect(() => {
      const res = this.kjResource();
      if (!res) {
        // No resource → clear the manual-pagination total so the table
        // falls back to client-side pagination on the user's `[kjData]`.
        this.t.setRowCount(null);
        return;
      }
      if (res.error() != null) {
        this.t.kjTableData.set([]);
        return;
      }
      if (res.isLoading()) return;
      const value = res.value();
      const rows = value?.rows;
      this.t.kjTableData.set(rows ? Array.from(rows) as TData[] : []);
      // Flip into manual-pagination mode and report the remote total
      // so the pagination footer / status bar see the full dataset
      // instead of just the current page slice.
      this.t.setRowCount(value?.rowCount ?? null);
    });

    // Persistence: on init, read from adapter and seed table state.
    effect(() => {
      const key = this.kjStorageKey();
      if (!key) return;
      const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
      if (!adapter) return;
      const tbl = untracked(() => this.t);
      if (!tbl) return;
      const persisted = adapter.read<Partial<KjTableState>>(key);
      if (persisted) {
        untracked(() => tbl.setState(persisted));
      }
    });

    // Persistence: watch state and write through. Reading `state()` once
    // is enough — the single signal invalidates on any slice change.
    effect(() => {
      const key = this.kjStorageKey();
      if (!key) return;
      const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
      if (!adapter) return;
      adapter.write(key, this.t.state());
    });

    // State-change emission.
    effect(() => {
      this.stateChange.emit(this.t.state());
    });
  }

  // ── Cell-edit handlers ──────────────────────────────────────────────────
  protected isEditing(cell: Cell<TData, unknown>): boolean {
    const e = this.editingCell();
    return !!e && e.rowId === cell.row.id && e.columnId === cell.column.id;
  }

  protected onCellClick(cell: Cell<TData, unknown>, _event: MouseEvent): void {
    if (this.kjEditOnDoubleClick()) return;
    this.tryBeginEdit(cell);
  }

  protected onCellDblClick(cell: Cell<TData, unknown>, _event: MouseEvent): void {
    if (!this.kjEditOnDoubleClick()) return;
    this.tryBeginEdit(cell);
  }

  protected onCellKeydown(cell: Cell<TData, unknown>, event: KeyboardEvent): void {
    if (event.key === 'F2') {
      event.preventDefault();
      this.tryBeginEdit(cell);
    } else if (event.key === 'Escape' && this.isEditing(cell)) {
      this.editingCell.set(null);
    } else if (event.key === ' ' && !this.isEditing(cell)) {
      // Space toggles row selection when selection is enabled (WCAG grid pattern).
      const mode = this.kjSelectionMode();
      if (mode === 'multi') {
        event.preventDefault();
        (cell.row as { toggleSelected?: () => void }).toggleSelected?.();
      } else if (mode === 'single') {
        event.preventDefault();
        this.t.table().setRowSelection({ [cell.row.id]: true });
      }
    } else if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
      // Cmd/Ctrl+A — select all (multi mode only).
      if (this.kjSelectionMode() === 'multi') {
        event.preventDefault();
        this.t.table().toggleAllRowsSelected(true);
      }
    }
  }

  private tryBeginEdit(cell: Cell<TData, unknown>): void {
    const meta = cellMeta(cell.column);
    if (!meta?.editable) return;
    this.editingCell.set({ rowId: cell.row.id, columnId: cell.column.id });
  }

  // ── Row-click handlers ──────────────────────────────────────────────────
  protected onRowClick(row: Row<TData>, event: MouseEvent): void {
    // A click that lands on an interactive control inside the row (group
    // toggle button, inline editor, link, etc.) should not double-toggle
    // row selection — only bare-row clicks count.
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, select, textarea, .kj-table-editor-anchor')) {
      this.rowClick.emit({ row: row.original, event });
      return;
    }
    this.applySelectionFromClick(row, event);
    this.rowClick.emit({ row: row.original, event });
  }

  protected onRowDblClick(row: Row<TData>, event: MouseEvent): void {
    this.rowDoubleClick.emit({ row: row.original, event });
  }

  /**
   * Toggle / replace row selection based on `kjSelectionMode`:
   *   - `'multi'`  → plain click toggles this row and moves the anchor.
   *     Shift-click selects every row between the anchor and here (range).
   *     Ctrl/Cmd-click toggles this row only (anchor moves, others kept).
   *   - `'single'` → set this row as the sole selection.
   *   - `'none'`   → no-op.
   */
  private applySelectionFromClick(row: Row<TData>, event: MouseEvent): void {
    const mode = this.kjSelectionMode();
    if (mode === 'none') return;
    const tbl = this.t.table();
    if (mode === 'single') {
      tbl.setRowSelection({ [row.id]: true });
      this.lastAnchorRowId = row.id;
      return;
    }
    // multi
    if (event.shiftKey && this.lastAnchorRowId !== null) {
      this.selectRange(this.lastAnchorRowId, row.id, true);
      return;
    }
    (row as { toggleSelected?: () => void }).toggleSelected?.();
    this.lastAnchorRowId = row.id;
  }

  /**
   * Capture the shift modifier from mousedown on a select-cell. The
   * checkbox's `checkedChange` doesn't carry the originating mouse event,
   * so we stash the modifier and consume it in `onRowCheckboxToggle`.
   */
  protected rememberClickModifiers(event: MouseEvent): void {
    this.lastClickShift = event.shiftKey;
  }

  /** Click on a row's checkbox: shift extends from anchor, else plain toggle. */
  protected onRowCheckboxToggle(row: Row<TData>): void {
    const wasShift = this.lastClickShift;
    this.lastClickShift = false;
    if (wasShift && this.lastAnchorRowId !== null && this.kjSelectionMode() === 'multi') {
      this.selectRange(this.lastAnchorRowId, row.id, true);
      return;
    }
    (row as { toggleSelected?: () => void }).toggleSelected?.();
    this.lastAnchorRowId = row.id;
  }

  /** Header "select all" checkbox change. */
  protected onSelectAll(checked: boolean): void {
    this.t.table().toggleAllPageRowsSelected(checked);
  }

  /**
   * Set every row between `fromId` and `toId` (inclusive, order-agnostic) to
   * `selected`. Existing selections OUTSIDE that window are preserved.
   */
  private selectRange(fromId: string, toId: string, selected: boolean): void {
    const rows = this.centerRows();
    const fromIdx = rows.findIndex((r) => r.id === fromId);
    const toIdx = rows.findIndex((r) => r.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
    const next: Record<string, boolean> = { ...this.t.state.rowSelection() };
    for (let i = start; i <= end; i++) {
      next[rows[i].id] = selected;
    }
    this.t.table().setRowSelection(next);
  }

  /**
   * Toggle a grouped row's expanded state. Wired to the click handler on the
   * group-cell's toggle button; `stopPropagation` prevents the parent row's
   * `(click)` from firing a row-click event for what is really a UI control.
   */
  protected onGroupToggle(row: Row<TData>, event: MouseEvent): void {
    event.stopPropagation();
    (row as { toggleExpanded?: () => void }).toggleExpanded?.();
  }

  // ── Header helpers ──────────────────────────────────────────────────────
  protected headerPin(h: Header<TData, unknown>): 'left' | 'right' | null {
    const p = h.column.getIsPinned?.();
    return p === 'left' || p === 'right' ? p : null;
  }

  /**
   * Lucide icon name for a sortable header's indicator. We read the column's
   * current sort state directly so the template re-evaluates whenever the
   * parent sort signal changes (TanStack's table proxy is signal-backed).
   */
  protected sortIcon(h: Header<TData, unknown>): 'chevron-up' | 'chevron-down' | 'chevrons-up-down' {
    const dir = h.column.getIsSorted?.();
    if (dir === 'asc') return 'chevron-up';
    if (dir === 'desc') return 'chevron-down';
    return 'chevrons-up-down';
  }

  protected filterTypeFor(col: Column<TData, unknown>): string | null {
    const meta = (col.columnDef.meta as { kj?: KjColumnMeta<TData> } | undefined)?.kj;
    if (!meta) return null;
    if (meta.filterable === false) return null;
    const type = meta.type;
    if (!type) return null;
    return type in BUILTIN_FILTERS ? type : null;
  }

  // ── Template helpers for the editor / filter outlet directives ─────────
  /** Resolves the editor component for a cell — column `meta.kj.editor`
   *  override, else the built-in editor that matches `meta.kj.type`. */
  protected editorTypeFor(cell: Cell<TData, unknown>): Type<unknown> | null {
    const meta = (cell.column.columnDef.meta as { kj?: KjColumnMeta<TData> } | undefined)?.kj;
    const custom = meta?.editor as Type<unknown> | undefined;
    if (custom) return custom;
    const type = meta?.type;
    if (!type) return BUILTIN_EDITORS['text']!;
    return BUILTIN_EDITORS[type] ?? null;
  }

  /** Build the meta bag handed to the editor through `KJ_EDITOR_CONTRACT`.
   *  Select options, min/max, custom params travel through here so editors
   *  don't need imperative input binding from the outlet. */
  protected editorMetaFor(cell: Cell<TData, unknown>): Record<string, unknown> | undefined {
    const meta = (cell.column.columnDef.meta as { kj?: KjColumnMeta<TData> } | undefined)?.kj;
    if (!meta) return undefined;
    const out: Record<string, unknown> = {};
    if (meta.selectOptions) out['options'] = meta.selectOptions;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  /** Resolves the filter component for a column — `meta.kj.filterUi` override
   *  else the built-in filter that matches `type`. */
  protected filterRendererFor(col: Column<TData, unknown>, type: string): Type<unknown> | null {
    const meta = (col.columnDef.meta as { kj?: KjColumnMeta<TData> } | undefined)?.kj;
    const custom = meta?.filterUi as Type<unknown> | undefined;
    return custom ?? BUILTIN_FILTERS[type] ?? null;
  }

  /** Editor `(commit)` from `KjCellEditorOutlet`: forward + close the editor. */
  protected onEditorCommit(cell: Cell<TData, unknown>, next: unknown): void {
    this.cellEdit.emit({
      row: cell.row.original,
      columnId: cell.column.id,
      oldValue: cell.getValue(),
      newValue: next,
    });
    this.editingCell.set(null);
  }

  /** Editor `(cancel)` from `KjCellEditorOutlet`: just close the editor. */
  protected onEditorCancel(): void {
    this.editingCell.set(null);
  }
}

// ── helpers ───────────────────────────────────────────────────────────────
function cellMeta<TData>(col: Column<TData, unknown>): KjColumnMeta<TData> | undefined {
  return (col.columnDef.meta as { kj?: KjColumnMeta<TData> } | undefined)?.kj;
}
