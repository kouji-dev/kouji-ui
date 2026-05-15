import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
  model,
} from '@angular/core';
import {
  KjDatePicker,
  KjDatePickerCalendar,
  KjDatePickerTrigger,
} from '@kouji-ui/core';
import { KjCalendarComponent } from '../calendar/calendar';

/**
 * Styled Date Picker. Pairs a typed `<input>` with a popover calendar for
 * single-date selection.
 *
 * Native `Date` only — locale-aware formatting and parsing via
 * `Intl.DateTimeFormat`. The input is the focusable form control; the toggle
 * button to its right opens the calendar; clicking a day cell commits the
 * value and closes the popover.
 *
 * **Accessibility (WCAG 2.1 AAA):**
 * - input has `role="combobox"` + `aria-haspopup="dialog"` + `aria-expanded`
 *   + `aria-controls` per APG combobox+dialog pattern.
 * - panel has `role="dialog"` and `aria-modal="false"` (non-modal popup —
 *   Esc + outside-click close, focus restored to the input on close).
 * - keyboard: ArrowDown / Alt+ArrowDown opens; Escape closes; Enter parses
 *   and commits typed text. Inside the calendar, the full APG day-grid
 *   keyboard contract applies.
 *
 * @doc-example Default
 *   Typed input plus a popover calendar bound to a `signal<Date>`.
 *   @doc-file date-picker.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common date-picker usages — two-way binding,
 *   min / max bounds, and a read-only field.
 *   @doc-file date-picker.usage.example.ts
 * @doc-example Min / max bounds
 *   `[kjMin]` / `[kjMax]` block out-of-range days in the calendar.
 *   @doc-file date-picker.with-min-max.example.ts
 * @doc-example Disabled dates
 *   `[kjDisabledDates]` predicate disables individual cells (e.g. weekends).
 *   @doc-file date-picker.disabled-dates.example.ts
 * @doc-example Locale
 *   `kjLocale="fr-FR"` flips formatting, parsing, and first day of week.
 *   @doc-file date-picker.locale.example.ts
 * @doc-example Read-only
 *   `[kjReadonly]="true"` displays the value but blocks typing and selection.
 *   @doc-file date-picker.readonly.example.ts
 *
 * @doc-keyboard
 *   ArrowDown|Alt+ArrowDown — Opens the calendar popover from the input
 *   Escape                  — Closes the popover and restores focus to the input
 *   Enter                   — Parses the typed value and commits it (or selects the focused day in the calendar)
 *   ArrowLeft|ArrowRight    — In the calendar, moves the focused day by 1
 *   ArrowUp|ArrowDown       — In the calendar, moves the focused day by 7 (one week)
 *   PageUp|PageDown         — In the calendar, moves the focused day by 1 month
 *   Home|End                — In the calendar, jumps to the first / last day of the week
 *
 * @doc-aria
 *   role="combobox"   — On the input
 *   aria-haspopup     — "dialog" on the input
 *   aria-expanded     — Reflects open / closed state
 *   aria-controls     — Links the input to the calendar dialog id
 *   role="dialog"     — On the panel; `aria-modal="false"` (non-modal popup)
 *   role="grid"       — On the day grid (inherited from `<kj-calendar>`)
 *
 * @doc-css-var
 *   --kj-date-picker-input-height — Input height. `data-size="sm|lg"` overrides; default 2.25rem.
 *
 * @doc-touch
 *   The default 2.25rem (36px) input relies on the inline-control exception
 *   inside form rows. Use `kjSize="lg"` on the host (or override
 *   `--kj-date-picker-input-height`) to reach the full 44px touch target.
 *
 * @doc-a11y
 *   Follows the APG combobox + dialog pattern — the input is the focusable
 *   form control, the popover is non-modal (Esc / outside-click close), and
 *   focus is restored to the input on close. Min / max / disabled-dates
 *   predicates apply to both keyboard navigation and pointer selection.
 *
 * @doc-related calendar,time-picker,field
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name date-picker
 * @doc-description Themed single-date picker pairing a typed input with a popover calendar and locale-aware parsing.
 * @doc-is-main
 */
@Component({
  selector: 'kj-date-picker',
  standalone: true,
  imports: [
    KjDatePicker,
    KjDatePickerTrigger,
    KjDatePickerCalendar,
    KjCalendarComponent,
  ],
  template: `
    <div
      kjDatePicker
      class="kj-date-picker"
      #picker="kjDatePicker"
      [kjValue]="kjValue() ?? null!"
      (kjValueChange)="kjValue.set($event)"
      [(kjOpen)]="kjOpen"
      [kjMin]="kjMin() ?? null!"
      [kjMax]="kjMax() ?? null!"
      [kjDisabledDates]="kjDisabledDates() ?? null!"
      [kjLocale]="kjLocale()"
      [kjFirstDayOfWeek]="kjFirstDayOfWeek() ?? 0"
      [kjReadonly]="kjReadonly()"
      [kjDisabled]="kjDisabled()"
    >
      <input
        kjDatePickerTrigger
        #trig="kjDatePickerTrigger"
        class="kj-date-picker__input"
        [placeholder]="kjPlaceholder()"
      />
      <div
        kjDatePickerCalendar
        [kjFor]="trig"
        class="kj-date-picker__panel"
      >
        <kj-calendar
          [(kjValue)]="kjValue"
          [kjMin]="kjMin()"
          [kjMax]="kjMax()"
          [kjDisabledDates]="kjDisabledDates()"
          [kjLocale]="kjLocale()"
          [kjFirstDayOfWeek]="kjFirstDayOfWeek() ?? 0"
          (kjValueChange)="onCalendarSelect($event, picker)"
        />
      </div>
    </div>
  `,
  styleUrl: './date-picker.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-date-picker-host', style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDatePickerComponent {
  /** Currently selected date. Two-way bindable — `[(kjValue)]`. `null` clears. */
  readonly kjValue = model<Date | null>(null);

  /** Two-way bindable open state for the popover. */
  readonly kjOpen = model<boolean>(false);

  /** Earliest selectable date (inclusive). `null` = open. */
  readonly kjMin = input<Date | null>(null);

  /** Latest selectable date (inclusive). `null` = open. */
  readonly kjMax = input<Date | null>(null);

  /** Per-date predicate; `false` disables the cell. */
  readonly kjDisabledDates = input<((d: Date) => boolean) | null>(null);

  /** BCP-47 locale tag. Defaults to Angular's `LOCALE_ID`. */
  readonly kjLocale = input<string>('');

  /** First day of the week override (0=Sun … 6=Sat). */
  readonly kjFirstDayOfWeek = input<number | null>(null);

  /** Placeholder text for the input. */
  readonly kjPlaceholder = input<string>('');

  /** Read-only — value displays but cannot be edited. */
  readonly kjReadonly = input<boolean, boolean | string>(false, { transform: booleanAttribute });

  /** Disable the entire picker. */
  readonly kjDisabled = input<boolean, boolean | string>(false, { transform: booleanAttribute });

  /** @internal — wired from the projected calendar. */
  onCalendarSelect(date: Date | null, picker: KjDatePicker): void {
    if (date) picker.selectDate(date);
  }
}
