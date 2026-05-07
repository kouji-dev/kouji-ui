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
 *   @doc-file time-picker.example.ts
 * @doc-example 12-hour with AM/PM
 *   @doc-file time-picker.12-hour.example.ts
 * @doc-example With seconds
 *   @doc-file time-picker.with-seconds.example.ts
 * @doc-example Range (start / end)
 *   @doc-file time-picker.range.example.ts
 * @doc-example Formatted string output
 *   @doc-file time-picker.formatted.example.ts
 * @category Library/Data input
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
      [(kjValue)]="kjValue"
      [kjValueShape]="kjValueShape()"
      [kj12Hour]="kj12Hour()"
      [kjHourCycle]="kjHourCycle()"
      [kjShowSeconds]="kjShowSeconds()"
      [kjStep]="kjStep()"
      [kjHourStep]="kjHourStep()"
      [kjMinuteStep]="kjMinuteStep()"
      [kjSecondStep]="kjSecondStep()"
      [kjMin]="kjMin()"
      [kjMax]="kjMax()"
      [kjReadonly]="kjReadonly()"
      [kjDisabled]="kjDisabled()"
      [kjInvalid]="kjInvalid()"
      [kjLocale]="kjLocale()"
      [kjReferenceDate]="kjReferenceDate()"
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
