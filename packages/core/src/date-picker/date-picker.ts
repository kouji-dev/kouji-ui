import {
  Directive,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjLocale } from '../locale/index';
import { startOfDay } from '../calendar/date-utils';
import { KJ_DATE_PICKER, type KjDatePickerContext } from './date-picker.context';

/**
 * Headless Date Picker root. Owns the value, the bounds / locale config, and
 * a two-way bindable `kjOpen` model. The actual show/hide wiring (and the
 * minted panel id) lives on the overlay primitives composed by
 * `KjDatePickerTrigger` (`KjOverlayTrigger`) and `KjDatePickerCalendar`
 * (`KjOverlayPanel`); the trigger bridges its overlay controller back into
 * this root's `kjOpen` model.
 *
 * Native `Date` only — locale-aware via `Intl.DateTimeFormat`.
 *
 * **Compound shape:**
 *
 * ```html
 * <div kjDatePicker [(kjValue)]="when">
 *   <input kjDatePickerTrigger #t="kjDatePickerTrigger" />
 *   <div kjDatePickerCalendar [kjFor]="t"></div>
 * </div>
 * ```
 *
 * @doc-category Core/Data input
 * @doc
 * @doc-name date-picker
 * @doc-description Unstyled date-picker root that owns the selected date, popover state, locale, and bounds.
 * @doc-is-main
 */
@Directive({
  selector: '[kjDatePicker]',
  standalone: true,
  exportAs: 'kjDatePicker',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  providers: [
    { provide: KJ_DATE_PICKER, useExisting: KjDatePicker },
  ],
})
export class KjDatePicker implements KjDatePickerContext {
  private readonly disabledHost = inject(KjDisabled);
  private readonly localeProvider = inject(KjLocale);

  /** Current selected value. Two-way bindable — `[(kjValue)]`. */
  readonly kjValue = model<Date | null>(null);

  /** Earliest selectable date (inclusive). */
  readonly kjMin = input<Date | null>(null);

  /** Latest selectable date (inclusive). */
  readonly kjMax = input<Date | null>(null);

  /** Per-date predicate. */
  readonly kjDisabledDates = input<((d: Date) => boolean) | null>(null);

  /** BCP-47 locale tag. Falls back to the `KjLocale` provider (`provideKjLocale`). */
  readonly kjLocale = input<string>('');

  /** First day of the week override (0=Sun … 6=Sat). */
  readonly kjFirstDayOfWeek = input<number | null>(null);

  /** Read-only — value displays but cannot be edited. */
  readonly kjReadonly = input<boolean, boolean | string>(false, { transform: booleanAttribute });

  /**
   * Two-way bindable open state for the popover. Bridged to the trigger's
   * overlay controller — flipping this opens/closes the calendar.
   *
   * Angular's `model()` accepts no `transform`, so the bare-attribute form
   * (`<div kjDatePicker kjOpen>`) binds the empty string and reads as `false`.
   * Bind it: `[(kjOpen)]="open"` or `[kjOpen]="true"`.
   */
  readonly kjOpen = model<boolean>(false);

  // ── KjDatePickerContext implementation ─────────────────────────────

  readonly value = this.kjValue.asReadonly();
  readonly open = this.kjOpen;
  readonly minDate = computed(() => this.kjMin());
  readonly maxDate = computed(() => this.kjMax());
  readonly disabledDates = computed(() => this.kjDisabledDates());
  readonly locale = computed(() => this.kjLocale() || this.localeProvider.locale());
  readonly disabled = this.disabledHost.disabled;
  readonly readonly = computed(() => this.kjReadonly());

  /** First-day-of-week override (re-exposed for the projected calendar). */
  readonly firstDayOfWeek = computed(() => this.kjFirstDayOfWeek());

  selectDate(date: Date): void {
    if (this.disabled() || this.readonly()) return;
    this.kjValue.set(startOfDay(date));
    this.kjOpen.set(false);
  }

  show(): void {
    if (this.disabled() || this.readonly()) return;
    this.kjOpen.set(true);
  }

  hide(): void {
    this.kjOpen.set(false);
  }

  toggle(): void {
    if (this.kjOpen()) this.hide();
    else this.show();
  }
}
