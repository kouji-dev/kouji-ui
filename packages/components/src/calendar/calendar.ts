import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
  model,
} from '@angular/core';
import {
  KjCalendar,
  KjCalendarDay,
  KjCalendarGrid,
  KjCalendarHeader,
} from '@kouji-ui/core';

/**
 * Styled calendar wrapper. Composes the headless `KjCalendar` directives into
 * a self-contained day-grid surface — header with prev/next arrows, weekday
 * row, and 6×7 day cells.
 *
 * Native `Date` only — locale-aware via `Intl.DateTimeFormat`. No third-party
 * date library.
 *
 * **Keyboard contract** (when focus is inside the grid, per APG):
 * - `ArrowLeft` / `ArrowRight` — ±1 day
 * - `ArrowUp` / `ArrowDown` — ±1 week
 * - `Home` / `End` — first / last day of the focused week
 * - `PageUp` / `PageDown` — ±1 month
 * - `Shift+PageUp` / `Shift+PageDown` — ±1 year
 * - `Enter` / `Space` — select the focused date
 *
 * @doc-example Default
 *   @doc-file calendar.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name calendar
 * @doc-is-main
 */
@Component({
  selector: 'kj-calendar',
  standalone: true,
  imports: [KjCalendar, KjCalendarHeader, KjCalendarGrid, KjCalendarDay],
  template: `
    <div
      kjCalendar
      class="kj-calendar"
      [(kjValue)]="kjValue"
      [kjMin]="kjMin()"
      [kjMax]="kjMax()"
      [kjDisabledDates]="kjDisabledDates()"
      [kjLocale]="kjLocale()"
      [kjFirstDayOfWeek]="kjFirstDayOfWeek()"
      [kjAriaLabel]="kjAriaLabel()"
      [kjDisabled]="kjDisabled()"
    >
      <div class="kj-calendar__header" kjCalendarHeader #hdr="kjCalendarHeader">
        <button
          type="button"
          class="kj-calendar__nav"
          aria-label="Previous month"
          [disabled]="hdr.prevDisabled()"
          (click)="hdr.prev()"
        >‹</button>
        <h2 class="kj-calendar__caption" [id]="hdr.captionId()">{{ hdr.label() }}</h2>
        <button
          type="button"
          class="kj-calendar__nav"
          aria-label="Next month"
          [disabled]="hdr.nextDisabled()"
          (click)="hdr.next()"
        >›</button>
      </div>
      <table class="kj-calendar__grid" kjCalendarGrid #g="kjCalendarGrid">
        <thead>
          <tr>
            @for (n of g.weekdayShort(); track $index) {
              <th
                scope="col"
                class="kj-calendar__weekday"
                [attr.abbr]="g.weekdayLong()[$index]"
              >{{ n }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (week of g.weeks(); track $index) {
            <tr>
              @for (d of week; track d.getTime()) {
                <td class="kj-calendar__cell">
                  <button
                    class="kj-calendar__day"
                    kjCalendarDay
                    [kjDate]="d"
                  >{{ d.getDate() }}</button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './calendar.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-calendar-host', style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCalendarComponent {
  /** Currently selected date. Two-way bindable — `[(kjValue)]`. `null` clears. */
  readonly kjValue = model<Date | null>(null);

  /** Earliest selectable date (inclusive). `null` = open. */
  readonly kjMin = input<Date | null>(null);

  /** Latest selectable date (inclusive). `null` = open. */
  readonly kjMax = input<Date | null>(null);

  /** Per-date predicate; `false` disables the cell. */
  readonly kjDisabledDates = input<((d: Date) => boolean) | null>(null);

  /** BCP-47 locale tag. Defaults to Angular's `LOCALE_ID`. */
  readonly kjLocale = input<string>('');

  /** First day of the week (0=Sun … 6=Sat). Locale-derived if not set. */
  readonly kjFirstDayOfWeek = input<number>(0);

  /** Accessible label override. Defaults to `"Calendar"`. */
  readonly kjAriaLabel = input<string>('Calendar');

  /** Disable the entire calendar. */
  readonly kjDisabled = input<boolean, boolean | string>(false, { transform: booleanAttribute });
}
