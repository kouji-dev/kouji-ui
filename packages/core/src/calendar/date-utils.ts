/**
 * Tiny date helpers used by the Calendar and Date Picker families.
 *
 * Native `Date` only — no third-party date library. Operations work in local
 * time zone (matching the user's runtime). Day-precision throughout —
 * comparisons strip the time portion via {@link startOfDay}.
 *
 * @doc-category Core/Data input
 */

/** Returns a new `Date` set to `00:00:00.000` in local time. */
export function startOfDay(date: Date): Date {
  const out = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return out;
}

/** Returns the first day of the month for `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Returns the last day of the month for `date`. */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Adds `days` calendar days to `date`. Negative values subtract. */
export function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

/** Adds `months` calendar months. Day-of-month clamps when target month is shorter. */
export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const out = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const dim = endOfMonth(out).getDate();
  out.setDate(Math.min(day, dim));
  return out;
}

/** Adds `years` calendar years. Feb 29 → Feb 28 on a non-leap target. */
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/** Returns true if `a` and `b` represent the same day in local time. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

/** Returns true if `a` and `b` are in the same month and year. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Day-precision compare. Negative if `a < b`, positive if `a > b`, 0 if equal. */
export function compareDay(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

/** True when `date` is within `[min, max]` (inclusive). `null` bounds are open. */
export function isInRange(date: Date, min: Date | null, max: Date | null): boolean {
  if (min && compareDay(date, min) < 0) return false;
  if (max && compareDay(date, max) > 0) return false;
  return true;
}

/**
 * Locale-aware first day of the week (0 = Sunday … 6 = Saturday).
 *
 * Reads `Intl.Locale.getWeekInfo()` when available (Chromium 99+, Safari 17+,
 * Firefox 130+); falls back to Sunday for `en` locales and Monday otherwise.
 */
export function firstDayOfWeek(locale: string): number {
  try {
    const loc = new Intl.Locale(locale);
    type LocWithWeek = Intl.Locale & { getWeekInfo?: () => { firstDay: number } };
    const info = (loc as LocWithWeek).getWeekInfo?.();
    if (info && typeof info.firstDay === 'number') {
      // Intl reports Mon=1 … Sun=7. Convert to 0..6 with Sun=0.
      return info.firstDay === 7 ? 0 : info.firstDay;
    }
  } catch {
    /* ignore */
  }
  return locale.startsWith('en') ? 0 : 1;
}

/**
 * Builds the 6×7 day-grid for `monthAnchor`. Always returns 42 cells —
 * leading/trailing days from neighbouring months fill the grid so callers
 * have a stable shape.
 *
 * @param monthAnchor — any `Date` whose month/year identifies the target month.
 * @param weekStart — `0..6` — first column of the grid.
 */
export function buildMonthMatrix(monthAnchor: Date, weekStart: number): Date[][] {
  const first = startOfMonth(monthAnchor);
  const firstDow = first.getDay();
  const offset = (firstDow - weekStart + 7) % 7;
  const gridStart = addDays(first, -offset);

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d += 1) {
      row.push(addDays(gridStart, w * 7 + d));
    }
    weeks.push(row);
  }
  return weeks;
}

/** Locale-aware short weekday names starting from `weekStart`. */
export function weekdayShortNames(locale: string, weekStart: number): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 1970-01-04 was a Sunday in UTC — anchor for stable iteration.
  const base = new Date(1970, 0, 4);
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(fmt.format(addDays(base, (i + weekStart) % 7)));
  }
  return out;
}

/** Locale-aware long weekday names starting from `weekStart`. Used for `<th abbr>`. */
export function weekdayLongNames(locale: string, weekStart: number): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const base = new Date(1970, 0, 4);
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(fmt.format(addDays(base, (i + weekStart) % 7)));
  }
  return out;
}

/** Locale-aware "April 2025" for the calendar caption. */
export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
}

/** Locale-aware long form for cell `aria-label` — "Tuesday, April 15, 2025". */
export function formatDateLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** Locale-aware short form for the Date Picker input — "4/15/2025" / "15/04/2025". */
export function formatDateShort(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

/**
 * Best-effort parse of a typed date string. Tries:
 *  1. `Date.parse()` on ISO-ish input (`yyyy-MM-dd`).
 *  2. Splitting on `/` `-` `.` ` ` and inferring locale order from the
 *     resolved options of `Intl.DateTimeFormat(locale, …)`.
 *
 * Returns `null` for empty / invalid input. Day-precision only.
 */
export function parseDate(value: string, locale: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // ISO 8601 (yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss)
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    const out = new Date(y, m, d);
    if (out.getFullYear() === y && out.getMonth() === m && out.getDate() === d) return out;
    return null;
  }

  const parts = trimmed.split(/[/\-.\s]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n))) return null;

  // Determine locale order via resolved-options of DateTimeFormat parts.
  const order = inferDateOrder(locale);
  let y: number, m: number, d: number;
  if (order === 'dmy') {
    [d, m, y] = nums as [number, number, number];
  } else if (order === 'ymd') {
    [y, m, d] = nums as [number, number, number];
  } else {
    [m, d, y] = nums as [number, number, number];
  }
  if (y < 100) y += y < 50 ? 2000 : 1900;
  m -= 1;
  const out = new Date(y, m, d);
  if (out.getFullYear() !== y || out.getMonth() !== m || out.getDate() !== d) return null;
  return out;
}

function inferDateOrder(locale: string): 'mdy' | 'dmy' | 'ymd' {
  try {
    const parts = new Intl.DateTimeFormat(locale).formatToParts(new Date(2000, 0, 2));
    const order: string[] = [];
    for (const p of parts) {
      if (p.type === 'day' || p.type === 'month' || p.type === 'year') order.push(p.type);
    }
    if (order[0] === 'year') return 'ymd';
    if (order[0] === 'day') return 'dmy';
    return 'mdy';
  } catch {
    return 'mdy';
  }
}
