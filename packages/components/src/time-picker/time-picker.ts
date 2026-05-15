import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
  model,
  numberAttribute,
} from '@angular/core';
import {
  KjHourCycle,
  KjTimePicker,
  KjTimePickerHours,
  KjTimePickerMeridiem,
  KjTimePickerMinutes,
  KjTimePickerSeconds,
  TimeParts,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `[kjTimePicker]` directive family. Renders
 * an internal HH : MM (: SS) row of segmented spinbuttons plus an AM/PM toggle
 * when 12-hour mode is active.
 *
 * Accepts and emits either `Date` (default) or `'HH:mm[:ss]'` strings via
 * `kjValueShape`. Per-segment ARIA wiring (`spinbutton`,
 * `aria-valuemin / max / now / text`) is forwarded by the headless directives.
 *
 * @doc-example Default (24-hour)
 *   The default playground — HH : MM spinbuttons, 24-hour cycle.
 *   @doc-file time-picker.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common time-picker usages — 24-hour, 12-hour
 *   with AM/PM, and a formatted string output bound to `[(kjValue)]`.
 *   @doc-file time-picker.usage.example.ts
 * @doc-example 12-hour with AM/PM
 *   `[kj12Hour]="true"` renders an AM/PM toggle next to the segments.
 *   @doc-file time-picker.12-hour.example.ts
 * @doc-example With seconds
 *   `kjShowSeconds` adds an HH : MM : SS spinbutton triple.
 *   @doc-file time-picker.with-seconds.example.ts
 * @doc-example Range (start / end)
 *   Two pickers wired with `[kjMin]` / `[kjMax]` so end can't precede start.
 *   @doc-file time-picker.range.example.ts
 * @doc-example Formatted string output
 *   `kjValueShape="string"` emits `'HH:mm[:ss]'` strings instead of `Date`.
 *   @doc-file time-picker.formatted.example.ts
 *
 * @doc-keyboard
 *   ArrowUp|ArrowDown   — Steps the focused segment up/down by its step value
 *   ArrowLeft|ArrowRight — Moves focus between segments (HH ↔ MM ↔ SS ↔ AM/PM)
 *   Home                — Sets the focused segment to its minimum
 *   End                 — Sets the focused segment to its maximum
 *   PageUp|PageDown     — Coarse step (10×) on the focused segment
 *   0-9                 — Type-ahead entry on the focused segment
 *   Enter|Space         — Toggles AM/PM when focused on the meridiem button
 *
 * @doc-aria
 *   role="group"        — applied to the host wrapping the segments
 *   role="spinbutton"   — set on each HH / MM / SS input by the headless directive
 *   aria-valuemin / max / now / text — wired per segment for AT announcement
 *   aria-label          — `kjAriaLabel` on the wrapper; per-segment labels via
 *                         `kjHoursLabel` / `kjMinutesLabel` / `kjSecondsLabel`
 *   aria-disabled       — Reflected when `[kjDisabled]="true"`
 *   data-disabled       — Mirrors disabled state for CSS hooks
 *
 * @doc-touch
 *   Each segment ships with the `md` density floor (≥ 44×44 via padding).
 *   The meridiem toggle inherits the same surface. `sm` keeps the floor —
 *   only horizontal padding shrinks.
 *
 * @doc-a11y
 *   Each segment is a real ARIA `spinbutton` so AT reads the current value,
 *   range, and step. Min/max gating is enforced at the directive layer — the
 *   picker never reports an out-of-range value through `(kjValueChange)`.
 *
 * @doc-related date-picker,number-input,form
 *
 * @doc-css-var
 *   --kj-time-picker-bg              — Background fill of the segment row.
 *   --kj-time-picker-fg              — Foreground (text) color of the segments.
 *   --kj-time-picker-border-color    — Border color of the segment row.
 *   --kj-time-picker-border-width    — Border thickness. Inherits --kj-border.
 *   --kj-time-picker-radius          — Corner radius. Inherits --kj-radius-field.
 *   --kj-time-picker-padding-x       — Horizontal padding of the segment row.
 *   --kj-time-picker-font            — Font family. Defaults to --kj-font-sans.
 *   --kj-time-picker-font-size       — Font size. Sizes (sm/md/lg) override.
 *   --kj-time-picker-segment-width   — Fixed width of each HH/MM/SS spinbutton.
 *   --kj-time-picker-height          — Row height. Sizes override.
 *   --kj-time-picker-meridiem-bg     — Background of the AM/PM toggle button.
 *   --kj-time-picker-meridiem-fg     — Foreground of the AM/PM toggle button.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name time-picker
 * @doc-description Themed time entry with HH MM SS spinbuttons, optional AM/PM, and `Date` or string output.
 * @doc-is-main
 */
@Component({
  selector: 'kj-time-picker',
  standalone: true,
  imports: [
    KjTimePicker,
    KjTimePickerHours,
    KjTimePickerMinutes,
    KjTimePickerSeconds,
    KjTimePickerMeridiem,
  ],
  template: `
    <div
      kjTimePicker
      class="kj-time-picker"
      [kjValue]="kjValue() ?? null!"
      (kjValueChange)="kjValue.set($event)"
      [kjValueShape]="kjValueShape()"
      [kj12Hour]="kj12Hour()"
      [kjHourCycle]="kjHourCycle()"
      [kjShowSeconds]="kjShowSeconds()"
      [kjStep]="kjStep()"
      [kjHourStep]="kjHourStep()"
      [kjMinuteStep]="kjMinuteStep()"
      [kjSecondStep]="kjSecondStep()"
      [kjMin]="kjMin() ?? null!"
      [kjMax]="kjMax() ?? null!"
      [kjReadonly]="kjReadonly()"
      [kjDisabled]="kjDisabled()"
      [kjInvalid]="kjInvalid()"
      [kjLocale]="kjLocale()"
      [kjReferenceDate]="kjReferenceDate() ?? null!"
      [attr.data-disabled]="kjDisabled() ? '' : null"
      [attr.aria-label]="kjAriaLabel()"
    >
      <input
        kjTimePickerHours
        class="kj-time-picker__segment kj-time-picker__hours"
        [kjAriaLabel]="kjHoursLabel()"
      />
      <span class="kj-time-picker__separator" aria-hidden="true">:</span>
      <input
        kjTimePickerMinutes
        class="kj-time-picker__segment kj-time-picker__minutes"
        [kjAriaLabel]="kjMinutesLabel()"
      />
      @if (kjShowSeconds()) {
        <span class="kj-time-picker__separator" aria-hidden="true">:</span>
        <input
          kjTimePickerSeconds
          class="kj-time-picker__segment kj-time-picker__seconds"
          [kjAriaLabel]="kjSecondsLabel()"
        />
      }
      @if (showMeridiem()) {
        <button
          type="button"
          kjTimePickerMeridiem
          class="kj-time-picker__meridiem"
          [attr.aria-label]="kjMeridiemLabel()"
          [kjAriaLabel]="kjMeridiemLabel()"
        ></button>
      }
    </div>
  `,
  styleUrl: './time-picker.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTimePickerComponent {
  /** Two-way bindable time value. `null` clears. */
  readonly kjValue = model<Date | string | null>(null);

  readonly kjValueShape = input<'date' | 'string'>('date');
  readonly kj12Hour = input(false, { transform: booleanAttribute });
  readonly kjHourCycle = input<KjHourCycle | 'auto'>('auto');
  readonly kjShowSeconds = input(false, { transform: booleanAttribute });

  readonly kjStep = input<number, unknown>(1, { transform: numberAttribute });
  readonly kjHourStep = input<number, unknown>(1, { transform: numberAttribute });
  readonly kjMinuteStep = input<number | undefined, unknown>(undefined, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v)),
  });
  readonly kjSecondStep = input<number, unknown>(1, { transform: numberAttribute });

  readonly kjMin = input<Date | string | TimeParts | null>(null);
  readonly kjMax = input<Date | string | TimeParts | null>(null);

  readonly kjReadonly = input(false, { transform: booleanAttribute });
  readonly kjDisabled = input(false, { transform: booleanAttribute });
  readonly kjInvalid = input(false, { transform: booleanAttribute });

  readonly kjLocale = input<string>('');
  readonly kjReferenceDate = input<Date | undefined>(undefined);

  readonly kjAriaLabel = input<string>('');
  readonly kjHoursLabel = input<string>('Hours');
  readonly kjMinutesLabel = input<string>('Minutes');
  readonly kjSecondsLabel = input<string>('Seconds');
  readonly kjMeridiemLabel = input<string>('Toggle AM/PM');

  /** Whether the meridiem toggle should be rendered. */
  protected readonly showMeridiem = computed(() => {
    if (this.kj12Hour()) return true;
    const cycle = this.kjHourCycle();
    return cycle === 'h11' || cycle === 'h12';
  });
}
