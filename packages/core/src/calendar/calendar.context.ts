import { InjectionToken, type Signal, type WritableSignal } from '@angular/core';

/**
 * Shared state contract for the Calendar family. Implemented by `KjCalendar`
 * and consumed by `KjCalendarHeader`, `KjCalendarGrid`, and `KjCalendarDay`
 * via DI. Headless directives never read each other's inputs directly — they
 * always go through this context.
 *
 * @doc-category Core/Data input
 */
export interface KjCalendarContext {
  /** Locale BCP-47 tag (e.g. `'en-US'`, `'fr-FR'`). Drives weekday and month names. */
  readonly locale: Signal<string>;

  /** Current selection. `null` when nothing is selected. */
  readonly value: Signal<Date | null>;

  /** The "active" date — the cell that owns `tabindex=0`. Drives keyboard focus. */
  readonly focusedDate: WritableSignal<Date>;

  /** Earliest selectable date (inclusive). `null` = open. */
  readonly minDate: Signal<Date | null>;

  /** Latest selectable date (inclusive). `null` = open. */
  readonly maxDate: Signal<Date | null>;

  /** Per-date predicate; `false` blocks selection / focus. */
  readonly disabledDates: Signal<((date: Date) => boolean) | null>;

  /** First day of the week (0=Sun … 6=Sat). Locale-derived if undefined. */
  readonly firstDayOfWeek: Signal<number>;

  /** Whether the entire calendar is disabled. */
  readonly disabled: Signal<boolean>;

  /** Auto-minted id of the header caption — used for `aria-labelledby` on the grid. */
  readonly captionId: Signal<string>;

  /** Combined disabled predicate (min/max/filter/global disabled). */
  isDisabled(date: Date): boolean;

  /** Selects a date. No-op if disabled. */
  selectDate(date: Date): void;

  /** Moves the focused date by `delta` of the given unit, skipping disabled dates. */
  moveFocus(unit: 'day' | 'week' | 'month' | 'year', delta: number): void;

  /** Snaps focus to the start or end of the focused week. */
  moveFocusToWeekBoundary(boundary: 'start' | 'end'): void;
}

/** DI token for the Calendar context. */
export const KJ_CALENDAR = new InjectionToken<KjCalendarContext>('KjCalendar');
