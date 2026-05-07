/**
 * Internal time helpers for `[kjTimePicker]`.
 *
 * The component stores time-of-day as `TimeParts` and serialises to either
 * `Date` or `string` on the CVA boundary. All comparisons and arithmetic run
 * over `TimeParts`.
 */

/** Internal time-of-day shape. Always 0-based hours (0–23). */
export interface TimeParts {
  hour: number;   // 0–23
  minute: number; // 0–59
  second: number; // 0–59
}

/** Resolved hour cycle. `auto` is normalised away by the wrapper. */
export type KjHourCycle = 'h11' | 'h12' | 'h23' | 'h24';

/** Zero-pad a non-negative integer to 2 digits. */
export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Resolve `'auto'` against a locale via `Intl.DateTimeFormat`. */
export function resolveHourCycle(
  cycle: KjHourCycle | 'auto',
  locale: string,
): KjHourCycle {
  if (cycle !== 'auto') return cycle;
  try {
    const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' })
      // hourCycle exists at runtime but is missing from TS lib types
      .resolvedOptions()['hourCycle' as keyof Intl.ResolvedDateTimeFormatOptions];
    if (resolved === 'h11' || resolved === 'h12' || resolved === 'h23' || resolved === 'h24') {
      return resolved;
    }
  } catch {
    /* fall through */
  }
  return 'h23';
}

/** Whether the cycle uses a 12-hour AM/PM presentation. */
export function is12Hour(cycle: KjHourCycle): boolean {
  return cycle === 'h11' || cycle === 'h12';
}

/** Convert internal 0–23 hour into the displayable hour for a cycle. */
export function toDisplayHour(hour24: number, cycle: KjHourCycle): number {
  switch (cycle) {
    case 'h11': return hour24 % 12;             // 0–11
    case 'h12': return ((hour24 + 11) % 12) + 1; // 1–12
    case 'h24': return hour24 === 0 ? 24 : hour24; // 1–24
    case 'h23':
    default:    return hour24;                   // 0–23
  }
}

/** Inverse of `toDisplayHour`, given the meridiem (`am`/`pm`) for h11/h12. */
export function fromDisplayHour(
  display: number,
  cycle: KjHourCycle,
  meridiem: 'am' | 'pm',
): number {
  switch (cycle) {
    case 'h11': {
      const base = ((display % 12) + 12) % 12;
      return meridiem === 'pm' ? base + 12 : base;
    }
    case 'h12': {
      const base = ((display - 1 + 12) % 12);
      return meridiem === 'pm' ? base + 12 : base;
    }
    case 'h24':
      return display === 24 ? 0 : display;
    case 'h23':
    default:
      return display;
  }
}

/** Inclusive segment range for the cycle (display values). */
export function hourBounds(cycle: KjHourCycle): { min: number; max: number } {
  switch (cycle) {
    case 'h11': return { min: 0, max: 11 };
    case 'h12': return { min: 1, max: 12 };
    case 'h24': return { min: 1, max: 24 };
    case 'h23':
    default:    return { min: 0, max: 23 };
  }
}

/** Modular add helper for an inclusive [0, mod) wrap. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Compare two `TimeParts` by total seconds-of-day. */
export function compareTime(a: TimeParts, b: TimeParts): number {
  const sa = a.hour * 3600 + a.minute * 60 + a.second;
  const sb = b.hour * 3600 + b.minute * 60 + b.second;
  return sa - sb;
}

/** Test whether `t` is inside [min, max], with overnight-range support. */
export function inRange(
  t: TimeParts,
  min: TimeParts | null,
  max: TimeParts | null,
): boolean {
  if (min == null && max == null) return true;
  if (min == null) return compareTime(t, max!) <= 0;
  if (max == null) return compareTime(t, min) >= 0;
  if (compareTime(min, max) <= 0) {
    return compareTime(t, min) >= 0 && compareTime(t, max) <= 0;
  }
  // Overnight: outside [max, min].
  return compareTime(t, min) >= 0 || compareTime(t, max) <= 0;
}

/** Format `TimeParts` as `'HH:mm'` / `'HH:mm:ss'`. */
export function formatTimeString(t: TimeParts, withSeconds: boolean): string {
  const base = `${pad2(t.hour)}:${pad2(t.minute)}`;
  return withSeconds ? `${base}:${pad2(t.second)}` : base;
}

/** Parse `'HH:mm'` / `'HH:mm:ss'` (lenient: accepts missing seconds). */
export function parseTimeString(s: string): TimeParts | null {
  const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = m[3] != null ? Number(m[3]) : 0;
  if (
    !Number.isFinite(hour) || hour < 0 || hour > 23 ||
    !Number.isFinite(minute) || minute < 0 || minute > 59 ||
    !Number.isFinite(second) || second < 0 || second > 59
  ) return null;
  return { hour, minute, second };
}

/** Convert any accepted value-shape into internal `TimeParts | null`. */
export function toParts(
  value: Date | string | TimeParts | null | undefined,
): TimeParts | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds(),
    };
  }
  if (typeof value === 'string') return parseTimeString(value);
  if (
    typeof value === 'object' &&
    typeof (value as TimeParts).hour === 'number' &&
    typeof (value as TimeParts).minute === 'number'
  ) {
    return {
      hour: (value as TimeParts).hour,
      minute: (value as TimeParts).minute,
      second: (value as TimeParts).second ?? 0,
    };
  }
  return null;
}

/** Project `TimeParts` onto a `Date`, copying the date part from `reference`. */
export function toDate(t: TimeParts, reference: Date): Date {
  const d = new Date(reference.getTime());
  d.setHours(t.hour, t.minute, t.second, 0);
  return d;
}

/** Snap a value to the closest lattice point of `step` from `0`. */
export function snapToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}
