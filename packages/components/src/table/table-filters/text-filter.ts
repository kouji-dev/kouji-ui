import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InjectionToken,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import type { Column, Table } from '@tanstack/angular-table';
import { KjVisuallyHidden, type KjTextFilterModel } from '@kouji-ui/core';
import { KjInputComponent } from '../../input/input';

/**
 * Context passed to every built-in filter UI. Resolves the TanStack
 * `Column` whose filter value the input writes, and the parent `Table`
 * for cross-column wiring (e.g. faceted unique values).
 */
export interface KjFilterContext<TData = unknown> {
  readonly column: Column<TData, unknown>;
  readonly table: Table<TData>;
}

/** DI token used to inject the `KjFilterContext` into filter components. */
export const KJ_FILTER_CONTEXT = new InjectionToken<KjFilterContext>(
  'kj.filter.context',
);

/** Default debounce window for the text filter, in milliseconds. */
const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Text filter UI. Renders a styled `<kj-input>` that writes the typed
 * string to `column.setFilterValue(...)` after a 300ms debounce so
 * keystrokes don't flood the table's filter model.
 *
 * Initial render seeds from `column.getFilterValue()` so the input
 * round-trips when the filter is restored from URL/state.
 *
 * The input is labelled via a wrapping `<label>` carrying a visually
 * hidden caption (`Filter by <header>`) so screen readers announce the
 * column the filter targets.
 *
 * @example
 * ```html
 * <kj-text-filter />  <!-- KJ_FILTER_CONTEXT must be provided in the host -->
 * ```
 */
@Component({
  selector: 'kj-text-filter',
  standalone: true,
  imports: [ReactiveFormsModule, KjInputComponent, KjVisuallyHidden],
  styleUrl: './filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-text-filter',
  },
  template: `
    <label class="kj-text-filter__label">
      <span kjVisuallyHidden>{{ ariaLabel() }}</span>
      <kj-input
        class="kj-text-filter__input"
        type="search"
        kjSize="xs"
        [formControl]="control"
      />
    </label>
  `,
})
export class KjTextFilter<TData = unknown> {
  private readonly ctx = inject<KjFilterContext<TData>>(KJ_FILTER_CONTEXT);
  private readonly destroyRef = inject(DestroyRef);

  /** Reactive form control driving the styled `<kj-input>`. */
  protected readonly control = new FormControl<string>(
    (() => {
      const v = this.ctx.column.getFilterValue();
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object' && (v as { filterType?: string }).filterType === 'text') {
        return (v as KjTextFilterModel).filter ?? '';
      }
      return '';
    })(),
    { nonNullable: true },
  );

  /** Accessible label derived from the column header. */
  protected readonly ariaLabel = computed(() => {
    const header = this.ctx.column.columnDef.header;
    const label = typeof header === 'string' ? header : this.ctx.column.id;
    return `Filter by ${label}`;
  });

  constructor() {
    this.control.valueChanges
      .pipe(debounceTime(DEFAULT_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value === '') {
          this.ctx.column.setFilterValue(undefined);
          return;
        }
        const model: KjTextFilterModel = { filterType: 'text', type: 'contains', filter: value };
        this.ctx.column.setFilterValue(model);
      });
  }
}
