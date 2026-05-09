import { InjectionToken, type Signal, type WritableSignal } from '@angular/core';

/**
 * Shared context for the Date Picker family. Implemented by `KjDatePicker`
 * (root) and consumed by `KjDatePickerTrigger` and `KjDatePickerCalendar`.
 *
 * @doc-category Core/Data input
 */
export interface KjDatePickerContext {
  /** Current value; `null` when empty. */
  readonly value: Signal<Date | null>;

  /** Open / closed state of the popover. */
  readonly open: WritableSignal<boolean>;

  /** Auto-minted id of the popover panel — consumers wire `aria-controls`. */
  readonly panelId: string;

  /** Earliest selectable date; `null` = open. */
  readonly minDate: Signal<Date | null>;

  /** Latest selectable date; `null` = open. */
  readonly maxDate: Signal<Date | null>;

  /** Per-date predicate. */
  readonly disabledDates: Signal<((d: Date) => boolean) | null>;

  /** BCP-47 locale tag. */
  readonly locale: Signal<string>;

  /** Whether the picker is disabled. */
  readonly disabled: Signal<boolean>;

  /** Whether the picker is read-only (no edits). */
  readonly readonly: Signal<boolean>;

  /** Selects a date and closes the popover. */
  selectDate(date: Date): void;

  /** Opens the popover. */
  show(): void;

  /** Closes the popover. */
  hide(): void;

  /** Toggles the popover open / closed. */
  toggle(): void;
}

export const KJ_DATE_PICKER = new InjectionToken<KjDatePickerContext>('KjDatePicker');
