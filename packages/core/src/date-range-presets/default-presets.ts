import { addDays, endOfMonth, startOfDay, startOfMonth } from '../calendar/date-utils';
import type { KjDateRangePreset } from './date-range-presets.context';

/** First day of the week containing `date`, given a week start (0=Sun…6=Sat). */
function startOfWeek(date: Date, weekStartsOn: number): Date {
  const day = startOfDay(date);
  const diff = (day.getDay() - weekStartsOn + 7) % 7;
  return addDays(day, -diff);
}

/** First day of the calendar quarter containing `date`. */
function startOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), q, 1);
}

/**
 * The built-in date range presets — Today, Yesterday, Last 7 / 30 days, This
 * week / month, Last month, This quarter, Year to date, Last year.
 *
 * All ranges are inclusive of both bounds. `Last 7 days` spans 7 calendar days
 * *including* today (today − 6 … today), matching how analytics tools count.
 *
 * @param weekStartsOn - First day of the week (0=Sun … 6=Sat) used by the
 *   `This week` preset. Defaults to Sunday; pass the locale's week start to
 *   align with the calendar.
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name date-range-presets
 */
export function defaultDateRangePresets(weekStartsOn = 0): KjDateRangePreset[] {
  return [
    {
      id: 'today',
      label: 'Today',
      getRange: (now) => ({ start: now, end: now }),
    },
    {
      id: 'yesterday',
      label: 'Yesterday',
      getRange: (now) => {
        const d = addDays(now, -1);
        return { start: d, end: d };
      },
    },
    {
      id: 'last-7-days',
      label: 'Last 7 days',
      getRange: (now) => ({ start: addDays(now, -6), end: now }),
    },
    {
      id: 'last-30-days',
      label: 'Last 30 days',
      getRange: (now) => ({ start: addDays(now, -29), end: now }),
    },
    {
      id: 'this-week',
      label: 'This week',
      getRange: (now) => ({ start: startOfWeek(now, weekStartsOn), end: now }),
    },
    {
      id: 'this-month',
      label: 'This month',
      getRange: (now) => ({ start: startOfMonth(now), end: now }),
    },
    {
      id: 'last-month',
      label: 'Last month',
      getRange: (now) => {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: startOfMonth(prev), end: endOfMonth(prev) };
      },
    },
    {
      id: 'this-quarter',
      label: 'This quarter',
      getRange: (now) => ({ start: startOfQuarter(now), end: now }),
    },
    {
      id: 'year-to-date',
      label: 'Year to date',
      getRange: (now) => ({ start: new Date(now.getFullYear(), 0, 1), end: now }),
    },
    {
      id: 'last-year',
      label: 'Last year',
      getRange: (now) => ({
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31),
      }),
    },
  ];
}
