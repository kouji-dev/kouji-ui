import { Directive, computed, inject } from '@angular/core';
import { addMonths, formatMonthYear } from './date-utils';
import { KJ_CALENDAR } from './calendar.context';

/**
 * Calendar header directive. Carries the auto-minted caption id so the grid's
 * `aria-labelledby` resolves automatically. Exposes computed `label` for the
 * caption text (locale-aware "April 2025") and `prev` / `next` methods that
 * advance the focused date by ±1 month.
 *
 * Buttons inside the header are the consumer's responsibility — wire
 * `(click)="header.prev()"` and `(click)="header.next()"` and read
 * `header.label()` for the caption text.
 *
 * @category Core/Data input
 */
@Directive({
  selector: '[kjCalendarHeader]',
  standalone: true,
  exportAs: 'kjCalendarHeader',
})
export class KjCalendarHeader {
  private readonly ctx = inject(KJ_CALENDAR);

  /** The id assigned to the header caption (mirror onto the caption's `id`). */
  readonly captionId = this.ctx.captionId;

  /** Locale-aware caption text — e.g. `"April 2025"`. */
  readonly label = computed(() =>
    formatMonthYear(this.ctx.focusedDate(), this.ctx.locale()),
  );

  /** Whether the previous-month button should be disabled (out-of-bounds month). */
  readonly prevDisabled = computed(() => {
    const min = this.ctx.minDate();
    if (!min) return false;
    const prevMonth = addMonths(this.ctx.focusedDate(), -1);
    // Disabled when the last day of the prev month is < min.
    const lastOfPrev = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    return lastOfPrev.getTime() < min.getTime();
  });

  /** Whether the next-month button should be disabled. */
  readonly nextDisabled = computed(() => {
    const max = this.ctx.maxDate();
    if (!max) return false;
    const nextMonth = addMonths(this.ctx.focusedDate(), 1);
    const firstOfNext = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    return firstOfNext.getTime() > max.getTime();
  });

  /** Move focus to the previous month (same day-of-month, clamped). */
  prev(): void {
    if (this.prevDisabled()) return;
    this.ctx.moveFocus('month', -1);
  }

  /** Move focus to the next month. */
  next(): void {
    if (this.nextDisabled()) return;
    this.ctx.moveFocus('month', 1);
  }
}
