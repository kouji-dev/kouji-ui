import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { Column } from '@tanstack/angular-table';
import type { KjNumberFilterModel, KjNumberFilterType } from '@kouji-ui/core';
import { KjNumberInputComponent } from '../../number-input/number-input';
import { KjOptionComponent, KjSelectComponent } from '../../select/select';
import { KJ_FILTER_CONTEXT, type KjFilterContext } from './text-filter';

/** Legacy tuple shape — kept exported because external consumers still pass
 *  `[min, max]` into `column.setFilterValue` for `inRange`-style filters. */
export type KjNumberRange = [min: number | undefined, max: number | undefined];

interface OperatorDescriptor {
  readonly value: KjNumberFilterType;
  readonly label: string;
  /** How many number inputs to render after the operator picker. */
  readonly inputs: 0 | 1 | 2;
}

/** Operators offered by the number filter, in display order. */
const OPERATORS: readonly OperatorDescriptor[] = [
  { value: 'equals',              label: '=',          inputs: 1 },
  { value: 'notEquals',           label: '≠',          inputs: 1 },
  { value: 'greaterThan',         label: '>',          inputs: 1 },
  { value: 'greaterThanOrEqual',  label: '≥',          inputs: 1 },
  { value: 'lessThan',            label: '<',          inputs: 1 },
  { value: 'lessThanOrEqual',     label: '≤',          inputs: 1 },
  { value: 'inRange',             label: 'Between',    inputs: 2 },
  { value: 'blank',               label: 'Is blank',   inputs: 0 },
  { value: 'notBlank',            label: 'Not blank',  inputs: 0 },
];

const OP_BY_VALUE: ReadonlyMap<KjNumberFilterType, OperatorDescriptor> = new Map(
  OPERATORS.map(o => [o.value, o] as const),
);

/**
 * Number filter UI: an operator picker followed by one or two compact number
 * inputs (zero for `blank` / `notBlank`). Writes a structured
 * {@link KjNumberFilterModel} to `column.setFilterValue(...)` so the filter
 * round-trips through `gridApi.filter.getModel()` for SSR backends.
 *
 * Backwards-compatibility: an `[min, max]` tuple persisted by the previous
 * iteration is read on init and surfaced as `inRange`, so users who saved a
 * table state under the old shape don't lose their filter.
 *
 * @doc-keyboard
 *   Tab          — Moves focus between the operator picker and the inputs
 *   Enter        — Commits the typed value (native number input semantics)
 *   ArrowUp/Down — Increment / decrement the focused input by 1
 */
@Component({
  selector: 'kj-number-filter',
  standalone: true,
  imports: [KjNumberInputComponent, KjSelectComponent, KjOptionComponent],
  styleUrl: './filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-number-filter',
  },
  template: `
    <kj-select
      class="kj-number-filter__operator"
      kjSize="xs"
      [value]="operator()"
      (valueChange)="onOperatorChange($event)"
      [attr.aria-label]="operatorAriaLabel()"
    >
      @for (op of operators; track op.value) {
        <kj-option [value]="op.value" [kjLabel]="op.label">{{ op.label }}</kj-option>
      }
    </kj-select>

    @if (inputsForOperator() >= 1) {
      <kj-number-input
        class="kj-number-filter__input kj-number-filter__input--primary"
        kjSize="xs"
        [kjAriaLabel]="primaryAriaLabel()"
        [kjValue]="$any(primary())"
        (kjValueChange)="onPrimaryChange($event)"
      />
    }
    @if (inputsForOperator() === 2) {
      <kj-number-input
        class="kj-number-filter__input kj-number-filter__input--secondary"
        kjSize="xs"
        [kjAriaLabel]="secondaryAriaLabel()"
        [kjValue]="$any(secondary())"
        (kjValueChange)="onSecondaryChange($event)"
      />
    }
  `,
})
export class KjNumberFilter<TData = unknown> {
  private readonly ctx = inject<KjFilterContext<TData>>(KJ_FILTER_CONTEXT);

  /** @internal — exposed for template iteration. */
  protected readonly operators = OPERATORS;

  protected readonly operator = signal<KjNumberFilterType>('equals');
  protected readonly primary = signal<number | undefined>(undefined);
  protected readonly secondary = signal<number | undefined>(undefined);

  protected readonly inputsForOperator = computed(
    () => OP_BY_VALUE.get(this.operator())?.inputs ?? 1,
  );

  private readonly columnLabel = computed(() => headerLabel(this.ctx.column));
  protected readonly operatorAriaLabel = computed(
    () => `${this.columnLabel()} filter operator`,
  );
  protected readonly primaryAriaLabel = computed(() => {
    const op = OP_BY_VALUE.get(this.operator());
    return op?.inputs === 2
      ? `Filter ${this.columnLabel()} minimum`
      : `Filter ${this.columnLabel()} value`;
  });
  protected readonly secondaryAriaLabel = computed(
    () => `Filter ${this.columnLabel()} maximum`,
  );

  constructor() {
    // Seed from any pre-existing filter value, honouring three shapes:
    //   - new structured `KjNumberFilterModel`
    //   - legacy `[min, max]` tuple (still emitted by URL state from older clients)
    //   - empty / null / undefined → defaults
    const v = this.ctx.column.getFilterValue();
    if (Array.isArray(v)) {
      const [min, max] = v as KjNumberRange;
      // [n, undefined] → equals; [undefined, n] → equals on n; [a, b] → inRange.
      if (min !== undefined && max !== undefined) {
        this.operator.set('inRange');
        this.primary.set(min);
        this.secondary.set(max);
      } else if (min !== undefined) {
        this.operator.set('greaterThanOrEqual');
        this.primary.set(min);
      } else if (max !== undefined) {
        this.operator.set('lessThanOrEqual');
        this.primary.set(max);
      }
    } else if (v && typeof v === 'object'
               && (v as { filterType?: string }).filterType === 'number') {
      const m = v as KjNumberFilterModel;
      this.operator.set(m.type);
      this.primary.set(m.filter);
      this.secondary.set(m.filterTo);
    }
  }

  protected onOperatorChange(next: unknown): void {
    const op = (typeof next === 'string' ? next : String(next ?? '')) as KjNumberFilterType;
    if (!OP_BY_VALUE.has(op)) return;
    const descriptor = OP_BY_VALUE.get(op)!;
    this.operator.set(op);
    // Drop the secondary input when we're no longer in a 2-input operator;
    // drop both when switching to `blank` / `notBlank`. This keeps the model
    // shape consistent with `descriptor.inputs`.
    if (descriptor.inputs === 0) {
      this.primary.set(undefined);
      this.secondary.set(undefined);
    } else if (descriptor.inputs === 1) {
      this.secondary.set(undefined);
    }
    this.commit();
  }

  protected onPrimaryChange(value: number | null): void {
    this.primary.set(normalise(value));
    this.commit();
  }

  protected onSecondaryChange(value: number | null): void {
    this.secondary.set(normalise(value));
    this.commit();
  }

  private commit(): void {
    const type = this.operator();
    const descriptor = OP_BY_VALUE.get(type);
    if (!descriptor) {
      this.ctx.column.setFilterValue(undefined);
      return;
    }
    if (descriptor.inputs === 0) {
      const model: KjNumberFilterModel = { filterType: 'number', type };
      this.ctx.column.setFilterValue(model);
      return;
    }
    const primary = this.primary();
    // 1- or 2-input operator with no primary set is a no-op (cleared state).
    if (primary === undefined && descriptor.inputs >= 1) {
      this.ctx.column.setFilterValue(undefined);
      return;
    }
    if (descriptor.inputs === 1) {
      const model: KjNumberFilterModel = { filterType: 'number', type, filter: primary };
      this.ctx.column.setFilterValue(model);
      return;
    }
    // inRange (2 inputs): keep the filter active even when only one side is
    // typed — TanStack's matcher reads the open side as ±∞.
    const secondary = this.secondary();
    if (primary === undefined && secondary === undefined) {
      this.ctx.column.setFilterValue(undefined);
      return;
    }
    const model: KjNumberFilterModel = {
      filterType: 'number',
      type,
      filter: primary,
      filterTo: secondary,
    };
    this.ctx.column.setFilterValue(model);
  }
}

function normalise(value: number | null | undefined): number | undefined {
  return value != null && Number.isFinite(value) ? value : undefined;
}

function headerLabel<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}
