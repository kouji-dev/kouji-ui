import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import type { Column } from '@tanstack/angular-table';
import { KjVisuallyHidden, type KjDateFilterModel } from '@kouji-ui/core';
import { KjDatePickerComponent } from '../../date-picker/date-picker';
import { KJ_FILTER_CONTEXT, type KjFilterContext } from './text-filter';

/** Filter value shape — ISO date strings (`YYYY-MM-DD`) or `undefined` per bound. */
export type KjDateRange = [from: string | undefined, to: string | undefined];

/**
 * Date-range filter UI. Renders two styled `<kj-date-picker>` controls
 * (from / to) and writes a `[from, to]` tuple of ISO date strings to
 * `column.setFilterValue`. Either bound may be blank to leave it open.
 *
 * The wire format stays string-based (`YYYY-MM-DD`) so it serialises
 * cleanly into URL state and round-trips without timezone surprises —
 * conversion to / from `Date` is local to the picker boundary.
 *
 * Each picker is wrapped in a `<label>` carrying visually-hidden text so
 * screen readers announce which bound the picker controls.
 */
@Component({
  selector: 'kj-date-filter',
  standalone: true,
  imports: [KjDatePickerComponent, KjVisuallyHidden],
  styleUrl: './filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-date-filter',
  },
  template: `
    <div class="kj-date-filter__label kj-date-filter__label--from">
      <span kjVisuallyHidden class="kj-date-filter__caption">{{ fromAriaLabel() }}</span>
      <kj-date-picker
        class="kj-date-filter__input kj-date-filter__input--from"
        kjSize="xs"
        [kjValue]="fromDate()"
        (kjValueChange)="onFromChange($event)"
      />
    </div>
    <div class="kj-date-filter__label kj-date-filter__label--to">
      <span kjVisuallyHidden class="kj-date-filter__caption">{{ toAriaLabel() }}</span>
      <kj-date-picker
        class="kj-date-filter__input kj-date-filter__input--to"
        kjSize="xs"
        [kjValue]="toDate()"
        (kjValueChange)="onToChange($event)"
      />
    </div>
  `,
})
export class KjDateFilter<TData = unknown> {
  private readonly ctx = inject<KjFilterContext<TData>>(KJ_FILTER_CONTEXT);

  private current: KjDateRange = (() => {
    const v = this.ctx.column.getFilterValue();
    if (Array.isArray(v)) return v as KjDateRange;
    if (v && typeof v === 'object' && (v as { filterType?: string }).filterType === 'date') {
      const m = v as KjDateFilterModel;
      return [m.dateFrom, m.dateTo];
    }
    return [undefined, undefined];
  })();

  protected readonly fromDate = computed(() => isoToDate(this.current[0]));
  protected readonly toDate = computed(() => isoToDate(this.current[1]));

  protected readonly fromAriaLabel = computed(
    () => `Filter by ${headerLabel(this.ctx.column)} from date`,
  );
  protected readonly toAriaLabel = computed(
    () => `Filter by ${headerLabel(this.ctx.column)} to date`,
  );

  protected onFromChange(date: Date | null): void {
    this.current = [dateToIso(date), this.current[1]];
    this.commit();
  }

  protected onToChange(date: Date | null): void {
    this.current = [this.current[0], dateToIso(date)];
    this.commit();
  }

  private commit(): void {
    const [from, to] = this.current;
    if (from === undefined && to === undefined) {
      this.ctx.column.setFilterValue(undefined);
      return;
    }
    const model: KjDateFilterModel = { filterType: 'date', type: 'inRange', dateFrom: from, dateTo: to };
    this.ctx.column.setFilterValue(model);
  }
}

function isoToDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  // Parse as local-time midnight so the date round-trips without TZ drift.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function headerLabel<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}
