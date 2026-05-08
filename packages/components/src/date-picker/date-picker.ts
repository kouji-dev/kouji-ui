import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewEncapsulation,
  booleanAttribute,
  inject,
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
 *   @doc-file date-picker.example.ts
 * @doc-example Min / max bounds
 *   @doc-file date-picker.with-min-max.example.ts
 * @doc-example Disabled dates
 *   @doc-file date-picker.disabled-dates.example.ts
 * @doc-example Locale
 *   @doc-file date-picker.locale.example.ts
 * @doc-example Read-only
 *   @doc-file date-picker.readonly.example.ts
 * @category Library/Data input
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
      <button
        type="button"
        class="kj-date-picker__toggle"
        aria-label="Open calendar"
        [attr.aria-haspopup]="'dialog'"
        [attr.aria-expanded]="picker.open()"
        [attr.aria-controls]="picker.panelId"
        [disabled]="kjDisabled() || kjReadonly()"
        (click)="picker.toggle()"
      >📅</button>
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
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);

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

  /** Outside-click coordinator — closes the popover when a click lands outside. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.kjOpen()) return;
    const root = this.elRef.nativeElement;
    if (!root.contains(event.target as Node)) {
      this.kjOpen.set(false);
    }
  }
}
