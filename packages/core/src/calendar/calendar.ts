import {
  Directive,
  LOCALE_ID,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { KjDisabled } from '../primitives/interaction/disabled';
import {
  addDays,
  addMonths,
  addYears,
  compareDay,
  endOfMonth,
  firstDayOfWeek as localeFirstDayOfWeek,
  isInRange,
  isSameDay,
  startOfDay,
  startOfMonth,
} from './date-utils';
import { KJ_CALENDAR, type KjCalendarContext } from './calendar.context';

let _captionIdCounter = 0;
function nextCaptionId(): string {
  _captionIdCounter += 1;
  return `kj-calendar-caption-${_captionIdCounter}`;
}

/**
 * Headless calendar root. Owns date selection state, the focused-date roving
 * signal, locale resolution, and the keyboard-navigation contract. Renders
 * nothing on its own — pair with `KjCalendarHeader`, `KjCalendarGrid`, and
 * `KjCalendarDay`.
 *
 * Composes `KjDisabled` for the global-disabled stance. Native `Date` only —
 * locale-aware via `Intl.DateTimeFormat`.
 *
 * **Keyboard contract** (when focus is on a day cell, per APG):
 * - `ArrowLeft` / `ArrowRight` — ±1 day
 * - `ArrowUp` / `ArrowDown` — ±1 week
 * - `Home` / `End` — first / last day of the focused week
 * - `PageUp` / `PageDown` — ±1 month
 * - `Shift+PageUp` / `Shift+PageDown` — ±1 year
 * - `Enter` / `Space` — select the focused date
 *
 * Disabled dates are skipped by keyboard navigation — pressing `ArrowRight`
 * lands on the next *selectable* day. Cells outside `kjMin` / `kjMax` carry
 * `aria-disabled="true"` and can't receive focus.
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name calendar
 * @doc-description Unstyled calendar root for date selection with locale, bounds, and full keyboard navigation.
 * @doc-is-main
 */
@Directive({
  selector: '[kjCalendar]',
  standalone: true,
  exportAs: 'kjCalendar',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  providers: [
    { provide: KJ_CALENDAR, useExisting: KjCalendar },
  ],
  host: {
    'role': 'application',
    'aria-roledescription': 'calendar',
    '[attr.aria-label]': 'computedAriaLabel()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class KjCalendar implements KjCalendarContext {
  private readonly disabledHost = inject(KjDisabled);
  private readonly defaultLocale = inject(LOCALE_ID);

  /** Current value. Two-way bindable — `[(kjValue)]`. `null` clears. */
  readonly kjValue = model<Date | null>(null);

  /** Earliest selectable date (inclusive). `null` = open. */
  readonly kjMin = input<Date | null>(null);

  /** Latest selectable date (inclusive). `null` = open. */
  readonly kjMax = input<Date | null>(null);

  /** Predicate returning `false` to disable specific dates (e.g. weekends). */
  readonly kjDisabledDates = input<((date: Date) => boolean) | null>(null);

  /** BCP-47 locale tag. Defaults to Angular's `LOCALE_ID`. */
  readonly kjLocale = input<string>('');

  /** First day of the week (0=Sun … 6=Sat). Defaults to locale-derived. */
  readonly kjFirstDayOfWeek = input<number | null>(null);

  /** Optional accessible label override. Defaults to `"Calendar"`. */
  readonly kjAriaLabel = input<string>('Calendar');

  /** Initially-focused date when no value is selected. Defaults to today. */
  readonly kjStartAt = input<Date | null>(null);

  // ── Context shared with children ───────────────────────────────────

  readonly locale = computed(() => this.kjLocale() || this.defaultLocale);
  readonly value = this.kjValue.asReadonly();
  readonly minDate = computed(() => this.kjMin());
  readonly maxDate = computed(() => this.kjMax());
  readonly disabledDates = computed(() => this.kjDisabledDates());
  readonly firstDayOfWeek = computed(() => {
    const explicit = this.kjFirstDayOfWeek();
    if (explicit !== null && explicit >= 0 && explicit <= 6) return explicit;
    return localeFirstDayOfWeek(this.locale());
  });
  readonly disabled = this.disabledHost.disabled;

  /** Internal focused-date signal. Two-way exposed via `kjFocusedDate` model. */
  readonly kjFocusedDate = model<Date>(startOfDay(new Date()));
  readonly focusedDate = this.kjFocusedDate;

  /** Auto-minted caption id — used by the grid's `aria-labelledby`. */
  readonly captionId = signal<string>(nextCaptionId());

  /** Computed accessible name combining label + active selection (for SR clarity). */
  readonly computedAriaLabel = computed(() => this.kjAriaLabel());

  constructor() {
    // Seed focusedDate from kjStartAt or kjValue or today.
    const seed = this.kjStartAt() ?? this.kjValue() ?? new Date();
    this.kjFocusedDate.set(startOfDay(seed));

    // Whenever the value changes externally, follow with focus.
    effect(() => {
      const v = this.kjValue();
      if (v) this.kjFocusedDate.set(startOfDay(v));
    });
  }

  // ── KjCalendarContext methods ──────────────────────────────────────

  isDisabled(date: Date): boolean {
    if (this.disabled()) return true;
    if (!isInRange(date, this.minDate(), this.maxDate())) return true;
    const filter = this.disabledDates();
    if (filter && !filter(date)) return true;
    return false;
  }

  selectDate(date: Date): void {
    if (this.isDisabled(date)) return;
    const sod = startOfDay(date);
    this.kjValue.set(sod);
    this.kjFocusedDate.set(sod);
  }

  moveFocus(unit: 'day' | 'week' | 'month' | 'year', delta: number): void {
    const start = this.focusedDate();
    let candidate = this.advance(start, unit, delta);
    // Skip disabled by stepping in the same direction one day at a time, max 366.
    if (this.isDisabled(candidate)) {
      const step = delta >= 0 ? 1 : -1;
      for (let i = 0; i < 366; i += 1) {
        candidate = addDays(candidate, step);
        if (this.minDate() && compareDay(candidate, this.minDate() as Date) < 0) break;
        if (this.maxDate() && compareDay(candidate, this.maxDate() as Date) > 0) break;
        if (!this.isDisabled(candidate)) {
          this.kjFocusedDate.set(startOfDay(candidate));
          return;
        }
      }
      // Couldn't find one — leave focus alone.
      return;
    }
    this.kjFocusedDate.set(startOfDay(candidate));
  }

  moveFocusToWeekBoundary(boundary: 'start' | 'end'): void {
    const f = this.focusedDate();
    const ws = this.firstDayOfWeek();
    const offset = (f.getDay() - ws + 7) % 7;
    const target = boundary === 'start' ? addDays(f, -offset) : addDays(f, 6 - offset);
    if (!this.isDisabled(target)) {
      this.kjFocusedDate.set(startOfDay(target));
    }
  }

  /** Snap focus to a specific date (used by the day-cell click handler). */
  setFocusedDate(date: Date): void {
    this.kjFocusedDate.set(startOfDay(date));
  }

  /** Helper: month-anchor for the currently-rendered grid. */
  readonly viewMonth = computed(() => startOfMonth(this.focusedDate()));

  private advance(date: Date, unit: 'day' | 'week' | 'month' | 'year', delta: number): Date {
    switch (unit) {
      case 'day':
        return addDays(date, delta);
      case 'week':
        return addDays(date, delta * 7);
      case 'month': {
        const target = addMonths(date, delta);
        // Clamp day-of-month if necessary.
        const last = endOfMonth(target).getDate();
        if (target.getDate() !== Math.min(date.getDate(), last)) {
          target.setDate(Math.min(date.getDate(), last));
        }
        return target;
      }
      case 'year': {
        const target = addYears(date, delta);
        const last = endOfMonth(target).getDate();
        if (target.getDate() !== Math.min(date.getDate(), last)) {
          target.setDate(Math.min(date.getDate(), last));
        }
        return target;
      }
    }
  }

  /** True when `date` is the currently-selected value. */
  isSelected(date: Date): boolean {
    const v = this.value();
    return !!v && isSameDay(v, date);
  }

  /** True when `date` matches today's local day. */
  isToday(date: Date): boolean {
    return isSameDay(date, new Date());
  }
}
