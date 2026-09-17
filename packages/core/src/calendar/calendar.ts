import {
  Directive,
  LOCALE_ID,
  Signal,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
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
import { KJ_CALENDAR, KJ_TODAY, type KjCalendarContext } from './calendar.context';
import { KjId } from '../primitives/overlay/id';

/** Widest scan for a selectable day before giving up: one year either side. */
const MAX_SCAN_DAYS = 366;

/**
 * Headless calendar root. Owns date selection state, the focused-date roving
 * signal, locale resolution, and the keyboard-navigation contract. Renders
 * nothing on its own — pair with `KjCalendarHeader`, `KjCalendarGrid`, and
 * `KjCalendarDay`.
 *
 * Composes `KjDisabled` for the global-disabled stance. Native `Date` only —
 * locale-aware via `Intl.DateTimeFormat`. "Today" comes from `KJ_TODAY`, so a
 * server render bakes no today marker.
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
 * lands on the next *selectable* day, and a jump past `kjMin` / `kjMax`
 * lands on the bound itself. The roving cell is always a selectable day: the
 * seed (selected value, else `kjStartAt`, else today) and any later change
 * of the bounds are clamped to the nearest selectable date, so the grid
 * always has one reachable tab stop. Cells outside `kjMin` / `kjMax` carry
 * `aria-disabled="true"`.
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
    'role': 'group',
    '[attr.aria-label]': 'computedAriaLabel()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class KjCalendar implements KjCalendarContext {
  private readonly disabledHost = inject(KjDisabled);
  private readonly defaultLocale = inject(LOCALE_ID);
  private readonly todayProvider = inject(KJ_TODAY);

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
  readonly today: Signal<Date | null> = computed(() => this.todayProvider());
  readonly minDate = computed(() => this.kjMin());
  readonly maxDate = computed(() => this.kjMax());
  readonly disabledDates = computed(() => this.kjDisabledDates());
  readonly firstDayOfWeek = computed(() => {
    const explicit = this.kjFirstDayOfWeek();
    if (explicit !== null && explicit >= 0 && explicit <= 6) return explicit;
    return localeFirstDayOfWeek(this.locale());
  });
  readonly disabled = this.disabledHost.disabled;

  /**
   * Internal focused-date signal. Two-way exposed via `kjFocusedDate` model.
   * Starts on today (the server clock only picks the month to render when
   * the visitor's clock is unknown) until the inputs are bound.
   */
  readonly kjFocusedDate = model<Date>(startOfDay(this.todayProvider() ?? new Date()));
  readonly focusedDate = this.kjFocusedDate;

  /** Auto-minted caption id — used by the grid's `aria-labelledby`. */
  readonly captionId = signal<string>(inject(KjId).mint('calendar-caption'));

  /** Computed accessible name combining label + active selection (for SR clarity). */
  readonly computedAriaLabel = computed(() => this.kjAriaLabel());

  constructor() {
    // Whenever the value changes externally, follow with focus.
    effect(() => {
      const v = this.kjValue();
      if (v) this.kjFocusedDate.set(startOfDay(v));
    });

    // A value-less calendar opens on `kjStartAt`. Read here, not in the
    // constructor body: inputs are only bound by the time effects first run.
    effect(() => {
      const start = this.kjStartAt();
      if (start && !untracked(this.kjValue)) this.kjFocusedDate.set(startOfDay(start));
    });

    // The roving cell must be reachable: whenever the focused date is not
    // selectable (seeded out of bounds, bounds tightened, predicate changed)
    // move it to the nearest date that is.
    effect(() => {
      const focused = this.kjFocusedDate();
      if (this.disabled() || !this.isDisabled(focused)) return;
      const next = untracked(() => this.nearestSelectable(focused));
      if (next) this.kjFocusedDate.set(next);
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
    const forward: 1 | -1 = delta >= 0 ? 1 : -1;
    const back: 1 | -1 = forward === 1 ? -1 : 1;
    const candidate = this.clampToBounds(this.advance(start, unit, delta));
    if (isSameDay(candidate, start)) return;
    // Continue in the direction of travel first; failing that, walk back
    // toward `start` so a jump past a bound still lands on the nearest
    // selectable day instead of doing nothing.
    const target =
      this.findSelectable(candidate, forward) ?? this.findSelectable(candidate, back, start);
    if (target) this.kjFocusedDate.set(target);
  }

  moveFocusToWeekBoundary(boundary: 'start' | 'end'): void {
    const f = this.focusedDate();
    const ws = this.firstDayOfWeek();
    const offset = (f.getDay() - ws + 7) % 7;
    const edge = boundary === 'start' ? addDays(f, -offset) : addDays(f, 6 - offset);
    const target = this.findSelectable(this.clampToBounds(edge), boundary === 'start' ? 1 : -1, f);
    if (target) this.kjFocusedDate.set(target);
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

  private clampToBounds(date: Date): Date {
    const min = this.minDate();
    const max = this.maxDate();
    let out = startOfDay(date);
    if (min && compareDay(out, min) < 0) out = startOfDay(min);
    if (max && compareDay(out, max) > 0) out = startOfDay(max);
    return out;
  }

  /**
   * First selectable day at `from` or beyond it in direction `step`, staying
   * inside the bounds and, when `limit` is given, strictly before it.
   */
  private findSelectable(from: Date, step: 1 | -1, limit?: Date): Date | null {
    const min = this.minDate();
    const max = this.maxDate();
    let candidate = from;
    for (let i = 0; i <= MAX_SCAN_DAYS; i += 1) {
      if (!isInRange(candidate, min, max)) return null;
      if (limit && (step > 0 ? compareDay(candidate, limit) >= 0 : compareDay(candidate, limit) <= 0)) {
        return null;
      }
      if (!this.isDisabled(candidate)) return candidate;
      candidate = addDays(candidate, step);
    }
    return null;
  }

  /** The selectable day closest to `date` — at it, else after it, else before it. */
  private nearestSelectable(date: Date): Date | null {
    const anchor = this.clampToBounds(date);
    return this.findSelectable(anchor, 1) ?? this.findSelectable(anchor, -1);
  }

  /** True when `date` is the currently-selected value. */
  isSelected(date: Date): boolean {
    const v = this.value();
    return !!v && isSameDay(v, date);
  }

  /** True when `date` is today's local day; always false where today is unknown (server). */
  isToday(date: Date): boolean {
    const today = this.today();
    return !!today && isSameDay(date, today);
  }
}
