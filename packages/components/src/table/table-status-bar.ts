import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { KJ_TABLE, KjTable } from '@kouji-ui/core';

/**
 * Tiny counts strip rendered at the bottom of a data table. Displays
 * "N rows • X selected • Filtered" derived from the table instance state.
 *
 * Must be projected inside an element carrying `kjTable` so that the
 * `KJ_TABLE` context token resolves.
 *
 * @example
 * ```html
 * <table [kjTable]="cols" [kjTableData]="rows">
 *   <!-- ...rows... -->
 *   <kj-table-status-bar />
 * </table>
 * ```
 *
 * Documented as part of the data table on the `table` page — not a standalone
 * docs entry.
 */
@Component({
  selector: 'kj-table-status-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="status-bar" role="status" aria-live="polite">
      <span>{{ rowCount() }} {{ rowCount() === 1 ? 'row' : 'rows' }}</span>
      @if (selectedCount() > 0) {
        <span class="sep" aria-hidden="true">•</span>
        <span>{{ selectedCount() }} selected</span>
      }
      @if (isFiltered()) {
        <span class="sep" aria-hidden="true">•</span>
        <span>Filtered</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--kj-font-sans);
      font-size: var(--kj-text-xs);
      color: var(--kj-fg-muted);
    }
    .status-bar {
      display: flex;
      align-items: center;
      gap: var(--kj-base-space-xs);
      padding: var(--kj-base-space-xs) var(--kj-base-space-md);
    }
    .sep { opacity: 0.6; }
  `],
  encapsulation: ViewEncapsulation.Emulated,
})
export class KjTableStatusBarComponent {
  private readonly table = inject(KJ_TABLE) as unknown as KjTable<unknown>;

  protected readonly rowCount = computed(() => this.table.table().getRowCount());

  protected readonly selectedCount = computed(
    () => Object.values(this.table.state.rowSelection()).filter(Boolean).length,
  );

  protected readonly isFiltered = computed(
    () => this.table.state.globalFilter() !== '' || this.table.state.columnFilters().length > 0,
  );
}
