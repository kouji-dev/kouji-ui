import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  TemplateRef,
  Type,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  contentChild,
  contentChildren,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import type { ResourceRef } from '@angular/core';
import {
  KjDirectionality,
  KjTable,
  KjVisuallyHidden,
  KjTableHeader,
  KjTableSort,
  KjTableRow,
  KjTableCell,
  KjTableKeyboardNav,
  KjIcon,
  KJ_TABLE_DEFAULT_PERSISTED_SLICES,
  KJ_TABLE_STORAGE,
  KJ_TABLE_STORAGE_KEY_PREFIX,
  pickTableState,
  type KjColumnMeta,
  type KjResourceResult,
  type KjStorageAdapter,
  type KjTablePersistedSlice,
  type KjTableState,
} from '@kouji-ui/core';
import type { Cell, Column, Header, Row, RowData } from '@tanstack/angular-table';
import { KjTableVirtual } from './table-virtual';
import { KjTableVirtualItem } from './table-virtual-item';
import { KjCellTemplate } from './table-cell-template';
import {
  KjTableEmptyTemplate,
  KjTableErrorTemplate,
  KjTableLoadingTemplate,
} from './table-state-templates';
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

/** Keyboard column resize: px per ArrowLeft / ArrowRight, and with Shift held. */
const RESIZE_STEP = 10;
const RESIZE_STEP_LARGE = 50;
/** TanStack's own `minSize` default, mirrored for `aria-valuemin`. */
const RESIZE_MIN_FALLBACK = 20;
/** `aria-valuemax` / End target for columns that declare no finite `maxSize`. */
const RESIZE_MAX_FALLBACK = 1000;

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
 * Server rendering: a virtualized body prerenders its first
 * `kjVirtualInitialRows` rows at the estimated height; the virtualizer takes
 * over after the first client render. Persistence reads and writes only in
 * the browser.
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
 *   Each sortable header is a button: click (or Enter / Space) to sort, again
 *   to flip direction, a third time to clear. Shift-click a second header to
 *   add a secondary sort.
 *   @doc-file table.sortable.example.ts
 * @doc-example Filterable [full]
 *   `[kjEnableFilters]="true"` renders a filter row under each header. Built-in
 *   text / number / date / select filters pick by `kjType`.
 *   @doc-file table.filterable.example.ts
 * @doc-example Selection [full]
 *   Multi-row selection with status-bar count + bulk-action slot.
 *   @doc-file table.selection.example.ts
 * @doc-example Inline editing [full]
 *   Double-click a cell — or focus it and press F2 / Enter — to mount the
 *   matching editor; Enter commits, Escape cancels. Listen to `(cellEdit)`
 *   and persist yourself.
 *   @doc-file table.editable.example.ts
 * @doc-example Column visibility [full]
 *   Show / hide columns via the toolbar's visibility menu.
 *   @doc-file table.column-visibility.example.ts
 * @doc-example Column resize [full]
 *   `[kjEnableResize]="true"` puts a grab handle on each `<th>` border. The
 *   handle is a focusable separator: ArrowLeft / ArrowRight resize by 10px
 *   (50px with Shift), Home / End jump to `minSize` / `maxSize`, Escape
 *   reverts to the width it had when focused.
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
 *   `@tanstack/virtual-core`. Rendered rows are measured, so
 *   `kjEstimatedRowSize` only seeds unmeasured rows; expansion rows are
 *   folded into their row's height. Before the virtualizer mounts (server,
 *   first paint) the first `kjVirtualInitialRows` rows render at the estimate.
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
 *   `[kjStorageKey]` + a `KjStorageAdapter` round-trip the view configuration
 *   (`kjPersistedSlices`: sorting, column filters, pagination, column sizing /
 *   visibility / order / pinning, grouping, density) through reload. Writes
 *   are debounced (`kjPersistDebounce`) and flushed on destroy; selection,
 *   expansion and the global filter are never persisted unless opted in.
 *   Namespace keys per app with `provideKjTableStorageKeyPrefix()`.
 *   @doc-file table.persistence.example.ts
 * @doc-example Export [full]
 *   CSV / JSON / clipboard export via `data-table-export` utilities, wired to
 *   the toolbar's export menu.
 *   @doc-file table.export.example.ts
 * @doc-example Empty and error [full]
 *   Override the defaults with `<ng-template kjEmptyTemplate>` /
 *   `kjErrorTemplate` / `kjLoadingTemplate` (lazy — instantiated only while
 *   that state is active). The older `[kjEmpty]` / `[kjError]` / `[kjLoading]`
 *   projection slots still work and act as the fallback.
 *   @doc-file table.empty-and-error.example.ts
 * @doc-example Keyboard [full]
 *   Tab enters the body on one cell (the last focused, initially the first);
 *   Arrow / Home / End / Ctrl+Home/End / PageUp/Down / F2 / Enter / Esc /
 *   Space / Cmd+A — full WAI-ARIA Grid pattern.
 *   @doc-file table.keyboard.example.ts
 *
 * @doc-css-var
 *   --kj-table-row-height  — Body row height. `data-density="compact|comfortable"`
 *                            overrides it; set it inline for a one-off
 *                            (`<kj-table style="--kj-table-row-height: 2.75rem">`).
 *                            Keep it a fixed length when virtualizing — the
 *                            virtualizer estimates from it.
 *   --kj-table-header-bg   — Fill behind the sticky header band. Defaults to
 *                            --kj-bg-surface.
 *
 *   The table has no `data-variant` slot: unlike button/alert/tag it is not a
 *   preset-driven component, so these two custom properties (plus the shared
 *   --kj-bg-* / --kj-border-* tokens the rules read) are the supported
 *   re-theming surface. An unlayered consumer rule on `.kj-table` beats
 *   `@layer kj.component` whatever its specificity, so per-app chrome that
 *   needs more than these two goes there.
 *
 * @doc-aria
 *   role=grid          The <table>, with aria-rowcount / aria-colcount
 *   role=status        A visually-hidden polite region announces sorting and
 *                      filtering changes (SC 4.1.3). Silent until something
 *                      changes; switch it off with [kjAnnounceChanges]="false"
 *                      and translate it through kjSortAnnouncement /
 *                      kjFilterAnnouncement. Pagination is announced by
 *                      <kj-table-pagination>'s own live summary, not here.
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
  // `<kj-table-pagination>` — can `injectParent(KJ_TABLE, ...)` from its element
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
    KjTableSort,
    KjTableRow,
    KjTableCell,
    KjTableKeyboardNav,
    KjTableVirtual,
    KjTableVirtualItem,
    KjIcon,
    KjCheckboxComponent,
    KjCellEditorOutlet,
    KjFilterCellOutlet,
    KjVisuallyHidden,
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
    // Drives the "state pane owns the leftover height" layout in table.css —
    // without it the body keeps `flex: 1` and shoves the empty pane to the
    // bottom of a height-constrained table instead of centering it.
    '[attr.data-empty]': 'showEmpty() ? "" : null',
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
          <!-- One row template for every body (pinned top, centre, virtual,
               pinned bottom). Declared inside <table> so the keyboard-nav
               content query and the KJ_TABLE / KJ_TABLE_KEYBOARD_NAV lookups
               see the stamped rows. -->
          <ng-template #rowTpl let-r let-virtualIndex="virtualIndex" let-virtual="virtual">
            @let editing = editingRowId() === r.id ? editingCell() : null;
            <tr kjTableRow [kjRow]="r"
                [kjTableVirtualItem]="virtualIndex ?? null"
                [kjVirtualOwner]="virtual ?? null"
                [kjMeasureDeps]="r.getIsExpanded?.()"
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
                @let isEditing = editing !== null && editing.columnId === c.column.id;
                <td kjTableCell [kjCell]="c"
                    [class.kj-table-cell--editing]="isEditing"
                    [style.width.px]="kjEnableResize() ? c.column.getSize() : null"
                    (click)="onCellClick(c, $event)"
                    (dblclick)="onCellDblClick(c, $event)"
                    (keydown)="onCellKeydown(c, $event)">
                  @if (isEditing) {
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
                    @let tpl = cellTemplateFor(c.column.id);
                    @if (tpl) {
                      <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original, value: c.getValue(), cell: c }" />
                    } @else {
                      {{ c.getValue() }}
                    }
                  }
                </td>
              }
            </tr>
            @if (kjRowExpansionTpl() && r.getIsExpanded?.() && !r.getIsGrouped?.()) {
              <tr class="kj-table-expansion-row" data-kj-virtual-extra>
                <td [attr.colspan]="aria.colCount()">
                  <ng-container
                    [ngTemplateOutlet]="kjRowExpansionTpl()!"
                    [ngTemplateOutletContext]="{ $implicit: r.original, row: r.original }"
                  />
                </td>
              </tr>
            }
          </ng-template>

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
                    @if (h.column.getCanSort?.()) {
                      <button kjTableSort class="kj-table-sort-button">
                        {{ h.column.columnDef.header }}
                        <i
                          class="kj-table-sort-indicator"
                          kjIconSize="sm"
                          aria-hidden="true"
                          [kjIcon]="sortIcon(h)"
                        ></i>
                      </button>
                    } @else {
                      {{ h.column.columnDef.header }}
                    }
                    @if (kjEnableResize() && h.column.getCanResize?.()) {
                      <span
                        class="kj-table-resize-handle"
                        role="separator"
                        tabindex="0"
                        aria-orientation="vertical"
                        [attr.aria-label]="resizeLabel(h)"
                        [attr.aria-valuemin]="resizeMin(h)"
                        [attr.aria-valuemax]="resizeMax(h)"
                        [attr.aria-valuenow]="h.getSize()"
                        [attr.aria-valuetext]="h.getSize() + ' pixels'"
                        (mousedown)="h.getResizeHandler()($event)"
                        (touchstart)="h.getResizeHandler()($event)"
                        (focus)="onResizeFocus(h)"
                        (keydown)="onResizeKeydown(h, $event)"
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
                <ng-container *ngTemplateOutlet="rowTpl; context: { $implicit: r }" />
              }
            </tbody>
          }

          @if (shouldVirtualize()) {
            <tbody
              kjTableVirtual
              [kjCount]="centerRows().length"
              [kjEstimateSize]="kjEstimatedRowSize()"
              [kjInitialRows]="kjVirtualInitialRows()"
              #v="kjTableVirtual"
            >
              @if (v.paddingTop() > 0) {
                <tr aria-hidden="true">
                  <td [attr.colspan]="aria.colCount()" [style.height.px]="v.paddingTop()"></td>
                </tr>
              }
              @for (vr of v.virtualRows(); track vr.key) {
                @if (centerRows()[vr.index]; as r) {
                  <ng-container *ngTemplateOutlet="rowTpl; context: { $implicit: r, virtualIndex: vr.index, virtual: v }" />
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
                <ng-container *ngTemplateOutlet="rowTpl; context: { $implicit: r }" />
              }
            </tbody>
          }

          @if (kjEnableRowPinning() && t.table().getBottomRows().length > 0) {
            <tbody class="kj-table-tbody-pinned" data-pin="bottom">
              @for (r of t.table().getBottomRows(); track r.id) {
                <ng-container *ngTemplateOutlet="rowTpl; context: { $implicit: r }" />
              }
            </tbody>
          }
        </table>

        <ng-content select="[kjSidePanel]" />
      </div>

      @if (showEmpty()) {
        <div class="kj-table-empty" role="status">
          @if (emptyTpl(); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl" />
          } @else {
            <ng-content select="[kjEmpty]" />
          }
        </div>
      }
      @if (hasError()) {
        <div class="kj-table-error" role="alert">
          @if (errorTpl(); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl" />
          } @else {
            <ng-content select="[kjError]" />
          }
        </div>
      }
      @if (isLoading()) {
        <div class="kj-table-loading"
             aria-live="polite"
             aria-busy="true"
             [attr.data-has-rows]="effectiveData().length > 0 ? '' : null">
          @if (loadingTpl(); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl" />
          } @else {
            <ng-content select="[kjLoading]">
              <span class="kj-table-loading-fallback">Loading…</span>
            </ng-content>
          }
        </div>
      }

      <!-- Sorting and filtering change the grid under the user with no visual
           event a screen reader reports (SC 4.1.3). One polite region carries
           both; it is empty until something actually changes. -->
      <div kjVisuallyHidden role="status" aria-live="polite">{{ statusAnnouncement() }}</div>

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
  /** Row height and cell padding scale. Defaults to `'standard'`. */
  readonly kjDensity = input<'compact' | 'standard' | 'comfortable'>('standard');
  /** Grid treatment for the table surface. Defaults to `'bordered'`. */
  readonly kjVariant = input<'bordered' | 'striped' | 'clean'>('bordered');
  /** External "I'm loading" flag, ORed with the resource's `isLoading()`. Defaults to `false`. */
  readonly kjLoading = input(false, { transform: booleanAttribute });

  // ── Selection ───────────────────────────────────────────────────────────
  /**
   * Two-way bound selection: a `Set` of row ids in `multi` mode, one row id in
   * `single` mode, `null` when nothing is selected. Defaults to `null`.
   */
  readonly kjSelection = model<Set<string> | string | null>(null);
  /** How many rows may be selected at once. Defaults to `'none'` (selection off). */
  readonly kjSelectionMode = input<'single' | 'multi' | 'none'>('none');
  /**
   * Whether the wrapper auto-renders a leading checkbox column. Defaults to
   * `true` whenever selection is enabled; set `false` to drive selection
   * purely from row clicks / external state without the column.
   */
  readonly kjShowSelectionColumn = input<boolean, unknown>(true, { transform: booleanAttribute });

  // ── Persistence ─────────────────────────────────────────────────────────
  /** Storage key; `null` disables persistence. Prefixed by `KJ_TABLE_STORAGE_KEY_PREFIX`. */
  readonly kjStorageKey = input<string | null>(null);
  /** Adapter for this table; falls back to the `KJ_TABLE_STORAGE` token. */
  readonly kjStorageAdapter = input<KjStorageAdapter | null>(null);
  /** State slices written to and restored from storage. Default: the view configuration, never selection. */
  readonly kjPersistedSlices = input<readonly KjTablePersistedSlice[]>(KJ_TABLE_DEFAULT_PERSISTED_SLICES);
  /** Trailing debounce for storage writes, in ms; `0` writes synchronously. Default 300. */
  readonly kjPersistDebounce = input<number>(300);

  // ── Virtualization ──────────────────────────────────────────────────────
  /**
   * Row windowing. `'auto'` (the default) turns it on past 200 rows; `true`
   * always windows, `false` never does. The bare attribute (`kjVirtual`) reads
   * as `true` — only the literal string `"auto"` selects the automatic mode.
   */
  readonly kjVirtual = input<boolean | 'auto', unknown>('auto', {
    transform: (v: unknown) => (v === 'auto' ? ('auto' as const) : booleanAttribute(v)),
  });
  /** Row height estimate in px, used until a row is measured. Default 36. */
  readonly kjEstimatedRowSize = input<number>(36);
  /** Rows a virtualized body renders before the virtualizer mounts (server render, first paint). Default 20. */
  readonly kjVirtualInitialRows = input<number>(20);

  // ── Feature toggles ─────────────────────────────────────────────────────
  /** Renders a filter row under each header. Defaults to `false`. */
  readonly kjEnableFilters = input<boolean, unknown>(false, { transform: booleanAttribute });
  /** Puts a drag/keyboard resize handle on each `<th>` border. Defaults to `false`. */
  readonly kjEnableResize = input<boolean, unknown>(false, { transform: booleanAttribute });
  /** Renders pinned rows in their own top/bottom sections. Defaults to `false`. */
  readonly kjEnableRowPinning = input<boolean, unknown>(false, { transform: booleanAttribute });
  /** Whether a double click starts cell editing (single click otherwise). Defaults to `true`. */
  readonly kjEditOnDoubleClick = input<boolean, unknown>(true, { transform: booleanAttribute });

  // ── Status announcements ───────────────────────────────────────────────
  /**
   * Announce sorting and filtering changes in a polite live region
   * (SC 4.1.3 Status Messages). Defaults to `true` — both actions rearrange
   * the grid with no other cue a screen-reader user can perceive. Switch it
   * off when the page already announces the same thing.
   */
  readonly kjAnnounceChanges = input<boolean, unknown>(true, { transform: booleanAttribute });

  /**
   * Builds the sort announcement. `column` is the column's header text (its id
   * when the header is not a plain string) and `direction` is `null` when
   * sorting was cleared.
   *
   * The English defaults are the library's fallback, not a translation seam —
   * bind this (and {@link kjFilterAnnouncement}) to route the strings through
   * your own i18n until the shared catalog carries table keys.
   */
  readonly kjSortAnnouncement = input<(column: string, direction: 'ascending' | 'descending' | null) => string>(
    (column, direction) =>
      direction ? `Sorted by ${column}, ${direction}` : `Sorting cleared for ${column}`,
  );

  /** Builds the filter announcement from the matched and total row counts. */
  readonly kjFilterAnnouncement = input<(matched: number, total: number) => string>(
    (matched, total) =>
      matched === 0 ? 'No rows match the filters' : `${matched} of ${total} rows match the filters`,
  );

  /**
   * Rows per page. `'all'` disables paging so every row renders and the
   * body scrolls (pair with a fixed-height host). `null` keeps the default
   * page size (25) — project `<kj-table-pagination>` to expose the controls;
   * without it the rows beyond the page are silently cut off.
   */
  readonly kjPageSize = input<number | 'all' | null>(null);

  // ── Row expansion template ─────────────────────────────────────────────
  /** Template for master-detail row expansion. Receives `$implicit = row`. */
  readonly kjRowExpansionTpl = contentChild<TemplateRef<unknown>>('kjRowExpansion');

  /** Custom cell templates declared as `ng-template[kjCellTemplate]` content. */
  private readonly cellTemplates = contentChildren(KjCellTemplate);

  // ── State templates ─────────────────────────────────────────────────────
  // Declared as `ng-template[kj{Empty,Loading,Error}Template]` content. When
  // present they win over the `[kjEmpty]` / `[kjLoading]` / `[kjError]`
  // projection slots, which stay supported for simple static markup.
  private readonly emptyTemplate = contentChild(KjTableEmptyTemplate);
  private readonly loadingTemplate = contentChild(KjTableLoadingTemplate);
  private readonly errorTemplate = contentChild(KjTableErrorTemplate);

  /** Empty-state template, or `null` to fall back to the `[kjEmpty]` slot. */
  protected readonly emptyTpl = computed<TemplateRef<unknown> | null>(
    () => this.emptyTemplate()?.template ?? null,
  );
  /** Loading template, or `null` to fall back to the `[kjLoading]` slot. */
  protected readonly loadingTpl = computed<TemplateRef<unknown> | null>(
    () => this.loadingTemplate()?.template ?? null,
  );
  /** Error template, or `null` to fall back to the `[kjError]` slot. */
  protected readonly errorTpl = computed<TemplateRef<unknown> | null>(
    () => this.errorTemplate()?.template ?? null,
  );

  /** Column id → registered cell template, rebuilt only when the content children change. */
  private readonly cellTemplateMap = computed<ReadonlyMap<string, TemplateRef<unknown>>>(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const t of this.cellTemplates()) map.set(t.kjCellTemplate(), t.template);
    return map;
  });

  /** Resolve the registered template for a column, if any. */
  protected cellTemplateFor(columnId: string): TemplateRef<unknown> | null {
    return this.cellTemplateMap().get(columnId) ?? null;
  }

  // ── Outputs ─────────────────────────────────────────────────────────────
  /** Fires once per committed cell edit, with the row, column id and new value. */
  readonly cellEdit = output<KjCellEditEvent<TData>>();
  /** Fires whenever sorting, filters, paging, sizing, order or pinning change. */
  readonly stateChange = output<KjTableState>();
  /** Fires on a single click anywhere in a body row. */
  readonly rowClick = output<KjRowClickEvent<TData>>();
  /** Fires on a double click anywhere in a body row. */
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
  private readonly keyPrefix = inject(KJ_TABLE_STORAGE_KEY_PREFIX);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly direction = inject(KjDirectionality);

  /** Tracks the cell currently in edit mode by row+column id. */
  protected readonly editingCell = signal<{ rowId: string; columnId: string } | null>(null);
  /** Row of the editing cell — lets every other row skip the per-cell comparison. */
  protected readonly editingRowId = computed(() => this.editingCell()?.rowId ?? null);

  /** Width a resize handle had when it received focus, restored by Escape. */
  private resizeOrigin: { columnId: string; size: number } | null = null;

  /** Writes a pending debounced storage write immediately. */
  private flushPersist: (() => void) | null = null;

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
   * The column the grid was last sorted by, kept after sorting is cleared so
   * the clearing itself can be announced by name rather than as silence.
   */
  private readonly lastSortedColumn = linkedSignal<readonly { id: string }[], string | null>({
    source: () => this.t.state.sorting(),
    computation: (sorting, previous) => sorting[0]?.id ?? previous?.value ?? null,
  });

  /**
   * Polite status text for the two actions that rearrange the grid with no
   * visual event a screen reader reports: sorting and filtering (SC 4.1.3
   * Status Messages). Pagination is NOT included — `<kj-table-pagination>`
   * already renders its own live "Showing X–Y of Z" summary, and repeating it
   * here would announce every page twice.
   *
   * Empty until something changes, so nothing is announced on first render.
   */
  protected readonly statusAnnouncement = computed<string>(() => {
    if (!this.kjAnnounceChanges()) return '';
    const parts: string[] = [];

    const sorting = this.t.state.sorting();
    // Read unconditionally: a `linkedSignal` only remembers a previous value
    // for computations that actually ran, so skipping it while sorting is
    // active would leave it empty exactly when clearing needs it.
    const previouslySorted = this.lastSortedColumn();
    const primary = sorting[0];
    if (primary) {
      parts.push(
        this.kjSortAnnouncement()(
          this.columnLabel(primary.id),
          primary.desc ? 'descending' : 'ascending',
        ),
      );
    } else if (previouslySorted) {
      parts.push(this.kjSortAnnouncement()(this.columnLabel(previouslySorted), null));
    }

    const filtered =
      this.t.state.columnFilters().length > 0 || !!this.t.state.globalFilter();
    if (filtered) {
      const table = this.t.table();
      parts.push(
        this.kjFilterAnnouncement()(
          table.getFilteredRowModel().rows.length,
          table.getCoreRowModel().rows.length,
        ),
      );
    }

    return parts.join('. ');
  });

  /** A column's header text when it is a plain string, else its id. */
  private columnLabel(columnId: string): string {
    const header = this.t.table().getColumn(columnId)?.columnDef.header;
    return typeof header === 'string' && header ? header : columnId;
  }

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

  /** Full storage key: app namespace + `kjStorageKey`, or `null` when persistence is off. */
  private readonly storageKey = computed<string | null>(() => {
    const key = this.kjStorageKey();
    return key ? this.keyPrefix + key : null;
  });

  /**
   * The projection of the state that reaches storage. Slices are replaced
   * immutably by the core directive, so identity per slice is the change
   * signal — a selection click no longer produces a new value here.
   */
  private readonly persistedState = computed<Partial<KjTableState>>(
    () => pickTableState(this.t.state(), this.kjPersistedSlices()),
    { equal: sameSlices },
  );

  constructor() {
    // `kjPageSize` input → pagination state. `'all'` renders every row
    // (scroll instead of paging).
    effect(() => {
      const size = this.kjPageSize();
      if (size == null) return;
      this.t.setState({
        pagination: { pageIndex: 0, pageSize: size === 'all' ? Number.MAX_SAFE_INTEGER : size },
      });
    });

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

    // Persistence: on init, read from the adapter and seed the persisted
    // slices only — a blob written before the slice list existed may still
    // carry selection or expansion, which must not come back.
    effect(() => {
      if (!this.isBrowser) return;
      const key = this.storageKey();
      if (!key) return;
      const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
      if (!adapter) return;
      const persisted = adapter.read<Partial<KjTableState>>(key);
      if (persisted) {
        untracked(() => this.t.setState(pickTableState(persisted, this.kjPersistedSlices())));
      }
    });

    // Persistence: write through, trailing-debounced so a drag-resize or a
    // burst of changes coalesces into one storage round-trip. A pending
    // write is flushed on destroy so navigating away never loses the last
    // change.
    effect((onCleanup) => {
      if (!this.isBrowser) return;
      const key = this.storageKey();
      if (!key) return;
      const adapter = this.kjStorageAdapter() ?? this.tokenStorage;
      if (!adapter) return;
      const snapshot = this.persistedState();
      const delay = this.kjPersistDebounce();
      if (delay <= 0) {
        adapter.write(key, snapshot);
        return;
      }
      const timer = setTimeout(() => {
        this.flushPersist = null;
        adapter.write(key, snapshot);
      }, delay);
      this.flushPersist = () => {
        clearTimeout(timer);
        this.flushPersist = null;
        adapter.write(key, snapshot);
      };
      onCleanup(() => clearTimeout(timer));
    });
    this.destroyRef.onDestroy(() => this.flushPersist?.());

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
    const onCell = event.target === event.currentTarget;
    if (event.key === 'F2' || (event.key === 'Enter' && onCell && !this.isEditing(cell))) {
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

  // ── Column resize (keyboard) ────────────────────────────────────────────
  /** Accessible name of a column's resize handle. */
  protected resizeLabel(h: Header<TData, unknown>): string {
    const header = h.column.columnDef.header;
    const label = typeof header === 'string' ? header : h.column.id;
    return `Resize column ${label}`;
  }

  /** Smallest width the handle may set — the column's `minSize`. */
  protected resizeMin(h: Header<TData, unknown>): number {
    return h.column.columnDef.minSize ?? RESIZE_MIN_FALLBACK;
  }

  /** Largest width the handle may set — the column's `maxSize`, or a practical cap when unbounded. */
  protected resizeMax(h: Header<TData, unknown>): number {
    const max = h.column.columnDef.maxSize;
    if (max != null && max < Number.MAX_SAFE_INTEGER) return max;
    return Math.max(h.getSize(), RESIZE_MAX_FALLBACK);
  }

  /** Remember the width a handle had on focus so Escape can revert to it. */
  protected onResizeFocus(h: Header<TData, unknown>): void {
    this.resizeOrigin = { columnId: h.column.id, size: h.getSize() };
  }

  /**
   * Keyboard resize on the header's separator handle: ArrowLeft / ArrowRight
   * step the width (Shift for the large step, swapped in RTL), Home / End go
   * to the min / max, Escape reverts to the width the handle had on focus.
   */
  protected onResizeKeydown(h: Header<TData, unknown>, event: KeyboardEvent): void {
    const size = h.getSize();
    const min = this.resizeMin(h);
    const max = this.resizeMax(h);
    const step = event.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP;
    const rtl = this.direction.current() === 'rtl';
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = rtl ? size - step : size + step; break;
      case 'ArrowLeft':  next = rtl ? size + step : size - step; break;
      case 'Home':       next = min; break;
      case 'End':        next = max; break;
      case 'Escape': {
        const origin = this.resizeOrigin;
        if (!origin || origin.columnId !== h.column.id || origin.size === size) return;
        next = origin.size;
        break;
      }
      default: return;
    }
    event.preventDefault();
    this.t.columnApi.sizing.setWidth(h.column.id, Math.min(max, Math.max(min, next)));
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

/** Same slices by identity — the core directive replaces a slice object only when its content changed. */
function sameSlices(a: Partial<KjTableState>, b: Partial<KjTableState>): boolean {
  const ak = Object.keys(a) as (keyof KjTableState)[];
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.is(a[k], b[k])) return false;
  }
  return true;
}
