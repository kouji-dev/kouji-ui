import { InjectionToken, type Signal } from '@angular/core';
import { startOfDay } from '../calendar/date-utils';

/**
 * A closed date interval, both bounds inclusive and normalized to
 * `startOfDay` (day precision — matching the Calendar / Date Picker family).
 *
 * @doc-category Core/Data input
 */
export interface KjDateRange {
  /** First day of the range (inclusive, `startOfDay`). */
  readonly start: Date;
  /** Last day of the range (inclusive, `startOfDay`). */
  readonly end: Date;
}

/**
 * A named quick-select for a {@link KjDateRange} — the unit the presets
 * listbox renders as one option.
 *
 * `getRange` is pure and receives the current instant so it is deterministic
 * in tests and lets consumers freeze "today".
 *
 * @doc-category Core/Data input
 */
export interface KjDateRangePreset {
  /** Stable identifier, e.g. `'last-7-days'`. */
  readonly id: string;
  /** Human-readable label, e.g. `'Last 7 days'`. */
  readonly label: string;
  /** Resolves the preset to a concrete range relative to `now`. */
  readonly getRange: (now: Date) => KjDateRange;
}

/**
 * Resolves a preset against `now`, normalizing both bounds to `startOfDay`.
 * `null` when the preset produces an inverted range (`start > end`).
 */
export function resolveDateRangePreset(
  preset: KjDateRangePreset,
  now: Date,
): KjDateRange | null {
  const raw = preset.getRange(now);
  const start = startOfDay(raw.start);
  const end = startOfDay(raw.end);
  if (start.getTime() > end.getTime()) return null;
  return { start, end };
}

/**
 * Shared context for the Date Range Presets family. Implemented by
 * `KjDateRangePresets` (listbox root) and consumed by
 * `KjDateRangePresetOption`.
 *
 * @doc-category Core/Data input
 */
export interface KjDateRangePresetsContext {
  /** The presets currently rendered as options. */
  readonly presets: Signal<readonly KjDateRangePreset[]>;

  /** Id of the currently selected preset; `null` when none is chosen. */
  readonly selectedId: Signal<string | null>;

  /** Whether the listbox is disabled. */
  readonly disabled: Signal<boolean>;

  /** Selects a preset — resolves its range and commits `kjValue`. */
  select(preset: KjDateRangePreset): void;

  /** True when `id` names the selected preset. */
  isSelected(id: string): boolean;
}

export const KJ_DATE_RANGE_PRESETS = new InjectionToken<KjDateRangePresetsContext>(
  'KjDateRangePresets',
);
