import {
  Directive,
  LOCALE_ID,
  Signal,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  signal,
} from '@angular/core';
import { KjDisabled, KjFormControl } from '../primitives';
import { KJ_TIME_PICKER, KjTimePickerContext } from './time-picker.context';
import {
  KjHourCycle,
  TimeParts,
  compareTime,
  formatTimeString,
  inRange,
  is12Hour,
  mod,
  resolveHourCycle,
  snapToStep,
  toDate,
  toParts,
} from './time-picker.format';

/**
 * Root directive for the time picker. Owns the time-of-day model, the resolved
 * hour cycle, segment bounds, the step config and the `KjFormControl` bridge.
 *
 * The directive renders no DOM of its own — it expects the consumer to project
 * a row of `[kjTimePickerHours]`, `[kjTimePickerMinutes]`, optional
 * `[kjTimePickerSeconds]`, and (when in 12h mode) `[kjTimePickerMeridiem]`
 * children. State flows through the `KJ_TIME_PICKER` context.
 *
 * @example
 * ```html
 * <div kjTimePicker [(kjValue)]="time" [kjStep]="15">
 *   <input kjTimePickerHours />
 *   <span aria-hidden="true">:</span>
 *   <input kjTimePickerMinutes />
 *   <button kjTimePickerMeridiem></button>
 * </div>
 * ```
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name time-picker
 * @doc-description Unstyled time-picker root that holds the time-of-day model and shares state with segment inputs.
 * @doc-is-main
 */
@Directive({
  selector: '[kjTimePicker]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
  ],
  providers: [{ provide: KJ_TIME_PICKER, useExisting: KjTimePicker }],
  exportAs: 'kjTimePicker',
  host: {
    'role': 'group',
    '[attr.aria-disabled]': 'formCtrl.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'kjReadonly() ? "true" : null',
    '[attr.aria-invalid]': 'ariaInvalid()',
    '[attr.data-hour-cycle]': 'hourCycle()',
  },
})
export class KjTimePicker implements KjTimePickerContext {
  /** @internal */
  readonly formCtrl = inject(KjFormControl);
  private readonly localeId = inject(LOCALE_ID);

  /** Two-way bindable time value. Accepts `Date`, `'HH:mm[:ss]'`, or `null`. */
  readonly kjValue = model<Date | string | null>(null);

  /** Output value shape. `'date'` emits a `Date`; `'string'` emits `'HH:mm[:ss]'`. */
  readonly kjValueShape = input<'date' | 'string'>('date');

  /** When true, force 12-hour AM/PM mode regardless of locale. */
  readonly kj12Hour = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Explicit hour cycle; `'auto'` resolves from the locale (or `kj12Hour`). */
  readonly kjHourCycle = input<KjHourCycle | 'auto'>('auto');

  /** Show the seconds segment. */
  readonly kjShowSeconds = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Minute step (canonical); ArrowUp / ArrowDown on the minutes segment use it. */
  readonly kjStep = input<number, unknown>(1, { transform: numberAttribute });

  /** Per-segment step overrides. */
  readonly kjHourStep = input<number, unknown>(1, { transform: numberAttribute });
  readonly kjMinuteStep = input<number | undefined, unknown>(undefined, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? undefined : numberAttribute(v)),
  });
  readonly kjSecondStep = input<number, unknown>(1, { transform: numberAttribute });

  /** Lower / upper time-of-day bounds. Accept `Date`, `'HH:mm[:ss]'`, or `null`. */
  readonly kjMin = input<Date | string | TimeParts | null>(null);
  readonly kjMax = input<Date | string | TimeParts | null>(null);

  /** Read-only state. */
  readonly kjReadonly = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** External invalid signal. OR'd with bounds for `aria-invalid`. */
  readonly kjInvalid = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** BCP-47 locale tag. Falls back to the injected `LOCALE_ID`. */
  readonly kjLocale = input<string | undefined>(undefined);

  /** Date used as the date part when emitting `Date` values. Defaults to `new Date()`. */
  readonly kjReferenceDate = input<Date | undefined>(undefined);

  // ── Internal state ────────────────────────────────────────────────────────

  private readonly _parts = signal<TimeParts | null>(null);
  /** Stable fallback reference Date when kjReferenceDate is undefined. */
  private readonly _refDate = new Date();

  /** @internal */
  readonly value: Signal<TimeParts | null> = this._parts.asReadonly();

  /** Resolved hour cycle (consumer-facing, via the context). */
  readonly hourCycle: Signal<KjHourCycle> = computed(() => {
    if (this.kj12Hour()) return 'h12';
    return resolveHourCycle(this.kjHourCycle(), this.kjLocale() ?? this.localeId);
  });

  readonly showSeconds: Signal<boolean> = computed(() => this.kjShowSeconds());

  readonly hourStep: Signal<number> = computed(() => Math.max(1, this.kjHourStep()));
  readonly minuteStep: Signal<number> = computed(() => Math.max(1, this.kjMinuteStep() ?? this.kjStep()));
  readonly secondStep: Signal<number> = computed(() => Math.max(1, this.kjSecondStep()));

  readonly min: Signal<TimeParts | null> = computed(() => toParts(this.kjMin()));
  readonly max: Signal<TimeParts | null> = computed(() => toParts(this.kjMax()));

  readonly disabled: Signal<boolean> = computed(() => this.formCtrl.disabled());
  readonly readonly: Signal<boolean> = computed(() => this.kjReadonly());
  readonly invalid: Signal<boolean> = computed(() => this.kjInvalid() || this.outOfRange());

  protected readonly outOfRange = computed(() => {
    const v = this._parts();
    if (v == null) return false;
    return !inRange(v, this.min(), this.max());
  });

  protected readonly ariaInvalid = computed(() => {
    const touched = this.formCtrl.touched();
    const invalid = this.kjInvalid() || this.outOfRange();
    return touched && invalid ? 'true' : null;
  });

  constructor() {
    // Bridge model ↔ internal parts.
    effect(() => {
      const next = toParts(this.kjValue());
      const cur = this._parts();
      if (!partsEqual(cur, next)) this._parts.set(next);
    });

    // Bridge KjFormControl ↔ model. Reactive forms write through `writeValue`.
    effect(() => {
      const cvaValue = this.formCtrl.value();
      if (cvaValue === undefined) return;
      const next = toParts(cvaValue as Date | string | null);
      if (!partsEqual(next, this._parts())) {
        this._parts.set(next);
      }
    });
  }

  // ── KjTimePickerContext implementation ────────────────────────────────────

  /** @internal */
  stepSegment(segment: 'hour' | 'minute' | 'second', units: number): void {
    if (this.formCtrl.disabled() || this.kjReadonly()) return;
    const cur = this._parts() ?? defaultParts();
    const step =
      segment === 'hour' ? this.hourStep() :
      segment === 'minute' ? this.minuteStep() :
      this.secondStep();
    let next: TimeParts;
    if (segment === 'hour') {
      next = { ...cur, hour: mod(cur.hour + units * step, 24) };
    } else if (segment === 'minute') {
      const total = cur.hour * 60 + cur.minute + units * step;
      const wrapped = mod(total, 24 * 60);
      next = { ...cur, hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
    } else {
      const total = cur.hour * 3600 + cur.minute * 60 + cur.second + units * step;
      const wrapped = mod(total, 24 * 3600);
      next = {
        hour: Math.floor(wrapped / 3600),
        minute: Math.floor((wrapped % 3600) / 60),
        second: wrapped % 60,
      };
    }
    this.commit(next);
  }

  /** @internal */
  setSegment(segment: 'hour' | 'minute' | 'second', value: number): void {
    if (this.formCtrl.disabled() || this.kjReadonly()) return;
    const cur = this._parts() ?? defaultParts();
    const next: TimeParts = { ...cur };
    if (segment === 'hour') next.hour = clamp(value, 0, 23);
    else if (segment === 'minute') next.minute = clamp(value, 0, 59);
    else next.second = clamp(value, 0, 59);
    this.commit(next);
  }

  /** @internal */
  togglePeriod(): void {
    if (!is12Hour(this.hourCycle())) return;
    if (this.formCtrl.disabled() || this.kjReadonly()) return;
    const cur = this._parts() ?? defaultParts();
    this.commit({ ...cur, hour: mod(cur.hour + 12, 24) });
  }

  /** @internal */
  setMeridiem(period: 'am' | 'pm'): void {
    if (!is12Hour(this.hourCycle())) return;
    if (this.formCtrl.disabled() || this.kjReadonly()) return;
    const cur = this._parts() ?? defaultParts();
    const isPm = cur.hour >= 12;
    if ((period === 'pm' && isPm) || (period === 'am' && !isPm)) return;
    this.commit({ ...cur, hour: mod(cur.hour + 12, 24) });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private commit(next: TimeParts): void {
    // Optionally snap step on commit. We only snap minutes / seconds when the
    // canonical step is > 1, mirroring PrimeNG's `stepMinute` clamping.
    let snapped = next;
    if (this.minuteStep() > 1) {
      snapped = { ...snapped, minute: clamp(snapToStep(snapped.minute, this.minuteStep()), 0, 59) };
    }
    if (this.secondStep() > 1) {
      snapped = { ...snapped, second: clamp(snapToStep(snapped.second, this.secondStep()), 0, 59) };
    }
    if (partsEqual(snapped, this._parts())) return;
    this._parts.set(snapped);
    const out = this.serialise(snapped);
    this.kjValue.set(out as Date | string | null);
    this.formCtrl.notifyChange(out);
  }

  private serialise(t: TimeParts): Date | string | null {
    if (this.kjValueShape() === 'string') {
      return formatTimeString(t, this.showSeconds());
    }
    return toDate(t, this.kjReferenceDate() ?? this._refDate);
  }
}

function partsEqual(a: TimeParts | null, b: TimeParts | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return compareTime(a, b) === 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function defaultParts(): TimeParts {
  return { hour: 0, minute: 0, second: 0 };
}
