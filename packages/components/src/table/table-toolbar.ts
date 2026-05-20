import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ViewEncapsulation,
  computed,
  inject,
  output,
} from '@angular/core';
import { KJ_TABLE, KjTable } from '@kouji-ui/core';
import { KjInputComponent } from '../input/input';
import { KjButtonComponent } from '../button/button';
import { KjButtonGroupComponent } from '../button-group/button-group';
import { KjCheckboxComponent } from '../checkbox/checkbox';
import {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
} from '@kouji-ui/core';

/** Density value emitted by the density toggle group. */
export type KjTableDensity = 'compact' | 'standard' | 'comfortable';

/** Export format requested via the toolbar's export menu. */
export type KjTableExportFormat = 'csv' | 'json' | 'clipboard';

/**
 * Marker directive for bulk-action content projected into
 * `<kj-table-toolbar>`. Bulk content is only rendered when the host
 * table has any selected rows.
 *
 * @example
 * ```html
 * <kj-table-toolbar>
 *   <kj-button kjVariant="destructive" kjBulkAction>Delete</kj-button>
 * </kj-table-toolbar>
 * ```
 */
@Directive({
  selector: '[kjBulkAction]',
  standalone: true,
})
export class KjBulkAction {}

/**
 * Toolbar chrome for `<kj-table>`. Composes:
 *
 * - **Quick filter input** — bound to `KjTable.globalFilter()`; typing writes
 *   `setState({ globalFilter })`.
 * - **Density toggle group** — three segmented buttons (compact / standard /
 *   comfortable) bound to `KjTable.density()`.
 * - **Column visibility menu** — dropdown listing every leaf column with a
 *   checkbox; toggling writes `setState({ columnVisibility })`.
 * - **Export menu** — dropdown with CSV / JSON / Clipboard items. Items emit
 *   the `(export)` output; the parent table wires the actual export utility
 *   in Phase C.
 * - **Bulk-action slot** — `<ng-content select="[kjBulkAction]">` shown only
 *   when at least one row is selected.
 *
 * The toolbar must sit inside a `<kj-table>` (or any element hosting
 * the `KJ_TABLE` token) so it can resolve the table instance via DI.
 *
 * @doc-category Components/Data
 * @doc
 * @doc-name table-toolbar
 * @doc-description Toolbar chrome above the data table — quick filter, density, column visibility, export, and bulk-action slot.
 */
@Component({
  selector: 'kj-table-toolbar',
  standalone: true,
  imports: [
    KjInputComponent,
    KjButtonComponent,
    KjButtonGroupComponent,
    KjCheckboxComponent,
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
  ],
  template: `
    <div class="kj-table-toolbar__filter">
      <span class="kj-visually-hidden">Quick filter</span>
      <kj-input
        type="search"
        placeholder="Filter rows..."
        [value]="globalFilter()"
        (input)="onFilter($event)"
      />
    </div>

    <kj-button-group
      class="kj-table-toolbar__density"
      kjAriaLabel="Row density"
    >
      <kj-button
        kjVariant="outline"
        kjSize="sm"
        [kjPressed]="density() === 'compact'"
        kjAriaLabel="Compact density"
        (click)="setDensity('compact')"
      >Compact</kj-button>
      <kj-button
        kjVariant="outline"
        kjSize="sm"
        [kjPressed]="density() === 'standard'"
        kjAriaLabel="Standard density"
        (click)="setDensity('standard')"
      >Standard</kj-button>
      <kj-button
        kjVariant="outline"
        kjSize="sm"
        [kjPressed]="density() === 'comfortable'"
        kjAriaLabel="Comfortable density"
        (click)="setDensity('comfortable')"
      >Comfortable</kj-button>
    </kj-button-group>

    <kj-button
      kjDropdownMenuTrigger
      #colTrigger="kjDropdownMenuTrigger"
      kjVariant="outline"
      kjSize="sm"
    >Columns</kj-button>
    <kj-dropdown-menu-content [kjFor]="colTrigger">
      @for (col of leafColumns(); track col.id) {
        <div kjDropdownMenuItem role="menuitemcheckbox" [attr.aria-checked]="isVisible(col.id)">
          <kj-checkbox
            [checked]="isVisible(col.id)"
            (checkedChange)="setColumnVisible(col.id, $event)"
          >{{ columnLabel(col) }}</kj-checkbox>
        </div>
      }
    </kj-dropdown-menu-content>

    <kj-button
      kjDropdownMenuTrigger
      #expTrigger="kjDropdownMenuTrigger"
      kjVariant="outline"
      kjSize="sm"
    >Export</kj-button>
    <kj-dropdown-menu-content [kjFor]="expTrigger">
      <button kjDropdownMenuItem type="button" (click)="emitExport('csv')">Export as CSV</button>
      <button kjDropdownMenuItem type="button" (click)="emitExport('json')">Export as JSON</button>
      <hr kjDropdownMenuSeparator />
      <button kjDropdownMenuItem type="button" (click)="emitExport('clipboard')">Copy to clipboard</button>
    </kj-dropdown-menu-content>

    @if (hasSelection()) {
      <div class="kj-table-toolbar__bulk" role="group" aria-label="Bulk actions">
        <ng-content select="[kjBulkAction]" />
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      /* Stay on a single row even when a bulk-action slot appears — wrapping
         would push the table down. The filter shrinks to make room. */
      flex-wrap: nowrap;
      align-items: center;
      gap: var(--kj-base-space-md, 0.75rem);
      padding: var(--kj-base-space-md, 0.75rem);
    }
    .kj-table-toolbar__filter { flex: 1 1 16rem; min-width: 6rem; display: flex; align-items: center; }
    .kj-table-toolbar__filter .kj-input { width: 100%; }
    .kj-table-toolbar__filter .kj-visually-hidden {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .kj-table-toolbar__bulk {
      display: flex;
      gap: var(--kj-base-space-sm, 0.5rem);
      margin-inline-start: auto;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-table-toolbar',
    'role': 'toolbar',
    'aria-label': 'Data table toolbar',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTableToolbarComponent {
  /** The host table — resolved through `KJ_TABLE` injected from any ancestor. */
  protected readonly table = inject<KjTable<unknown>>(KJ_TABLE);

  /** Emits when the user picks an export format from the toolbar's export menu. */
  readonly export = output<KjTableExportFormat>();

  protected readonly globalFilter = this.table.state.globalFilter;
  protected readonly density = this.table.state.density;

  /** All leaf columns from the TanStack table instance. Recomputes when columns change. */
  protected readonly leafColumns = computed(() => {
    const t = this.table.table();
    return t.getAllLeafColumns();
  });

  /** True when the host table has at least one selected row. */
  protected readonly hasSelection = computed(() => {
    const sel = this.table.state.rowSelection();
    for (const key in sel) {
      if (sel[key]) return true;
    }
    return false;
  });

  protected onFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.table.setState({ globalFilter: value });
  }

  protected setDensity(value: KjTableDensity): void {
    this.table.setState({ density: value });
  }

  protected isVisible(columnId: string): boolean {
    const map = this.table.state.columnVisibility();
    // TanStack convention: a column is visible unless explicitly false.
    return map[columnId] !== false;
  }

  protected setColumnVisible(columnId: string, visible: boolean): void {
    const next = { ...this.table.state.columnVisibility(), [columnId]: visible };
    this.table.setState({ columnVisibility: next });
  }

  protected columnLabel(col: { id: string; columnDef: { header?: unknown } }): string {
    const header = col.columnDef.header;
    return typeof header === 'string' ? header : col.id;
  }

  protected emitExport(format: KjTableExportFormat): void {
    this.export.emit(format);
  }
}
