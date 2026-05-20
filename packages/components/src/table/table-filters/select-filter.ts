import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import type { Column } from '@tanstack/angular-table';
import { KjVisuallyHidden, type KjColumnMeta, type KjSetFilterModel } from '@kouji-ui/core';
import { KjOptionComponent, KjSelectComponent } from '../../select/select';
import { KJ_FILTER_CONTEXT, type KjFilterContext } from './text-filter';

/** Option descriptor for the select filter dropdown. */
export interface KjSelectFilterOption {
  readonly label: string;
  readonly value: unknown;
}

/** Sentinel value used by the "All" option to clear the column filter. */
const ALL_VALUE = '__kj_filter_all__';

/**
 * Select-filter UI. Renders a styled `<kj-select>` bound to the column's
 * filter value. Choosing the leading "All" entry clears the filter
 * (`setFilterValue(undefined)`); any other choice writes the option's
 * `value` verbatim.
 *
 * The dropdown is wrapped in a `<label>` carrying visually-hidden caption
 * text so screen readers announce the filtered column.
 */
@Component({
  selector: 'kj-select-filter',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent, KjVisuallyHidden],
  styleUrl: './filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-select-filter',
  },
  template: `
    <div class="kj-select-filter__label">
      <span kjVisuallyHidden>{{ ariaLabel() }}</span>
      <kj-select
        class="kj-select-filter__control"
        kjSize="xs"
        [value]="currentValueKey()"
        (valueChange)="onChange($event)"
      >
        <kj-option [value]="allKey" [kjLabel]="allLabel()">{{ allLabel() }}</kj-option>
        @for (opt of resolvedOptions(); track $index) {
          <kj-option [value]="keyOf($index)" [kjLabel]="opt.label">{{ opt.label }}</kj-option>
        }
      </kj-select>
    </div>
  `,
})
export class KjSelectFilter<TData = unknown> {
  private readonly ctx = inject<KjFilterContext<TData>>(KJ_FILTER_CONTEXT);

  /** Options shown in the dropdown. Optional — if omitted, the filter
   *  derives entries from the column's `meta.kj.selectOptions` so consumers
   *  don't need to wire two places. The leading "All" entry is rendered
   *  automatically either way. */
  readonly options = input<readonly KjSelectFilterOption[] | null>(null);
  /** Label for the "clear filter" entry. */
  readonly allLabel = input<string>('All');

  /** Effective option set — `[options]` input wins over column meta2ui
   *
   . */
  protected readonly resolvedOptions = computed<readonly KjSelectFilterOption[]>(() => {
    const supplied = this.options();
    if (supplied && supplied.length > 0) return supplied;
    const meta = (this.ctx.column.columnDef.meta as { kj?: KjColumnMeta<TData> } | undefined)?.kj;
    const raw = meta?.selectOptions ?? [];
    return raw.map<KjSelectFilterOption>((o) =>
      typeof o === 'object' && o !== null && 'label' in (o as object) && 'value' in (o as object)
        ? (o as KjSelectFilterOption)
        : { label: String(o), value: o },
    );
  });

  /** @internal — exposed for template binding. */
  protected readonly allKey = ALL_VALUE;

  protected readonly ariaLabel = computed(() => `Filter by ${headerLabel(this.ctx.column)}`);

  /** Maps the column's current filter value back to the matching option index, or `ALL_VALUE`. */
  protected readonly currentValueKey = computed(() => {
    const current = this.ctx.column.getFilterValue();
    if (current === undefined || current === null) return ALL_VALUE;
    // Single value (legacy) OR `KjSetFilterModel` with one entry.
    const value =
      current &&
      typeof current === 'object' &&
      (current as { filterType?: string }).filterType === 'set'
        ? ((current as KjSetFilterModel).values[0] as unknown)
        : current;
    const idx = this.resolvedOptions().findIndex((o) => Object.is(o.value, value));
    return idx === -1 ? ALL_VALUE : this.keyOf(idx);
  });

  protected keyOf(index: number): string {
    return String(index);
  }

  protected onChange(value: unknown): void {
    const key = typeof value === 'string' ? value : String(value ?? '');
    if (key === ALL_VALUE || key === '') {
      this.ctx.column.setFilterValue(undefined);
      return;
    }
    const idx = Number(key);
    const opt = this.resolvedOptions()[idx];
    if (!opt) {
      this.ctx.column.setFilterValue(undefined);
      return;
    }
    const model: KjSetFilterModel = { filterType: 'set', values: [opt.value] };
    this.ctx.column.setFilterValue(model);
  }
}

function headerLabel<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}
