import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
  model,
} from '@angular/core';
import {
  KjDatePicker,
  KjDatePickerTrigger,
  KjDatePickerCalendar,
} from '@kouji-ui/core';
import { KjCalendarComponent } from '../calendar/calendar';

/** Format a Date as a locale short date + HH:mm time. */
function formatDateTime(d: Date, locale: string): string {
  const date = new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'short' }).format(d);
  const time = new Intl.DateTimeFormat(locale || undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return date + ' ' + time;
}

/** "HH:mm" for the panel's time input. */
function toTimeString(d: Date | null): string {
  if (!d) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return hh + ':' + mm;
}

/**
 * Themed datetime picker — the date-picker's calendar popover plus a time
 * field in the panel. Value is a single native `Date` carrying both parts.
 *
 * Unlike `kj-date-picker`, selecting a calendar day keeps the panel open so
 * the time can be adjusted; the day merge preserves the current time-of-day
 * (defaults to 09:00 for a fresh value). Close with Escape or by clicking
 * outside.
 *
 * @doc-example Default
 *   Pick a meeting date and time — a single `Date` two-way binding.
 *   @doc-file datetime-picker.example.ts
 *
 * @doc-keyboard
 *   Enter|ArrowDown — Opens the calendar popover from the trigger
 *   Escape          — Closes the popover and returns focus to the trigger
 *
 * @doc-css-var
 *   --kj-datetime-picker-input-height — Height of the trigger input. Sizes override.
 *
 * @doc-related date-picker,calendar,time-picker
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name datetime-picker
 * @doc-description Themed date + time picker sharing one native Date value; calendar popover with a time field.
 * @doc-is-main
 */
@Component({
  selector: 'kj-datetime-picker',
  standalone: true,
  imports: [KjDatePicker, KjDatePickerTrigger, KjDatePickerCalendar, KjCalendarComponent],
  template: `
    <div
      kjDatePicker
      class="kj-datetime-picker"
      #picker="kjDatePicker"
      [attr.data-size]="kjSize() === 'md' ? null : kjSize()"
      [kjValue]="kjValue() ?? null!"
      (kjValueChange)="kjValue.set($event)"
      [(kjOpen)]="kjOpen"
      [kjMin]="kjMin() ?? null!"
      [kjMax]="kjMax() ?? null!"
      [kjLocale]="kjLocale()"
      [kjFirstDayOfWeek]="kjFirstDayOfWeek() ?? 0"
      [kjReadonly]="kjReadonly()"
      [kjDisabled]="kjDisabled()"
    >
      <input
        kjDatePickerTrigger
        #trig="kjDatePickerTrigger"
        class="kj-datetime-picker__input"
        [kjDisplayFormat]="displayFormat"
        [placeholder]="kjPlaceholder()"
      />
      <div kjDatePickerCalendar [kjFor]="trig" class="kj-datetime-picker__panel">
        <kj-calendar
          [kjValue]="kjValue()"
          [kjMin]="kjMin()"
          [kjMax]="kjMax()"
          [kjLocale]="kjLocale()"
          [kjFirstDayOfWeek]="kjFirstDayOfWeek() ?? 0"
          (kjValueChange)="onCalendarSelect($event)"
        />
        <label class="kj-datetime-picker__time">
          <span class="kj-datetime-picker__time-label">{{ kjTimeLabel() }}</span>
          <input
            type="time"
            class="kj-datetime-picker__time-input"
            [value]="timeText()"
            [disabled]="kjDisabled()"
            (change)="onTimeInput($event)"
          />
        </label>
      </div>
    </div>
  `,
  styleUrl: './datetime-picker.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-datetime-picker-host', style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDatetimePickerComponent {
  /** Selected date + time. Two-way bindable — `[(kjValue)]`. `null` clears. */
  readonly kjValue = model<Date | null>(null);

  /** Two-way bindable open state for the popover. */
  readonly kjOpen = model<boolean>(false);

  /** Earliest selectable date (inclusive). */
  readonly kjMin = input<Date | null>(null);

  /** Latest selectable date (inclusive). */
  readonly kjMax = input<Date | null>(null);

  /** BCP-47 locale tag. Defaults to Angular's `LOCALE_ID`. */
  readonly kjLocale = input<string>('');

  /** First day of the week override (0=Sun … 6=Sat). */
  readonly kjFirstDayOfWeek = input<number | null>(null);

  /** Placeholder text for the trigger input. */
  readonly kjPlaceholder = input<string>('');

  /** Label for the time row inside the panel. */
  readonly kjTimeLabel = input<string>('Time');

  /** Hour used when a day is picked on a previously-empty value. */
  readonly kjDefaultHour = input<number>(9);

  readonly kjReadonly = input<boolean, boolean | string>(false, { transform: booleanAttribute });
  readonly kjDisabled = input<boolean, boolean | string>(false, { transform: booleanAttribute });

  /** Size preset for the trigger input. */
  readonly kjSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  /** Trigger display: locale short date + HH:mm. */
  readonly displayFormat = formatDateTime;

  readonly timeText = computed(() => toTimeString(this.kjValue()));

  /** Merge the picked day into the value, preserving time-of-day. Keeps the
   *  panel open so the time can be adjusted next. */
  onCalendarSelect(day: Date | null): void {
    if (!day) {
      this.kjValue.set(null);
      return;
    }
    const prev = this.kjValue();
    const next = new Date(day);
    if (prev) {
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    } else {
      next.setHours(this.kjDefaultHour(), 0, 0, 0);
    }
    this.kjValue.set(next);
  }

  /** Merge an "HH:mm" time into the value, preserving the date part. */
  onTimeInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const match = /^(\d{2}):(\d{2})$/.exec(raw);
    if (!match) return;
    const base = this.kjValue() ?? new Date();
    const next = new Date(base);
    next.setHours(Number(match[1]), Number(match[2]), 0, 0);
    this.kjValue.set(next);
  }
}
