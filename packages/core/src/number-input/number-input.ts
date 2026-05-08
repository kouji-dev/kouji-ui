import {
  Directive,
  ElementRef,
  LOCALE_ID,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  signal,
} from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';
import { KJ_NUMBER_INPUT, KjNumberInputContext } from './number-input.context';
import { KjNumberInputGroup } from './number-input-group';
import {
  clamp,
  formatForEdit,
  formatNumber,
  parseNumber,
  snapToStep,
  type KjNumberFormatOptions,
} from './number-input.format';

let nextId = 0;

/**
 * Enhances a native `<input>` with numeric-spinbox semantics: bounded
 * `kjMin` / `kjMax` / `kjStep`, increment / decrement on ArrowUp / ArrowDown,
 * PageUp / PageDown / Home / End, optional locale-aware display formatting via
 * `Intl.NumberFormat`, and the WAI-ARIA `spinbutton` contract
 * (`aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-valuetext`).
 *
 * The directive is a sibling to `[kjInput]`, not a sub-directive: the CVA
 * model is `number | null` (not `string | null`) and the keyboard contract
 * adds Arrow / Page / Home / End semantics. The two are mutually exclusive on
 * the same element.
 *
 * Compose with `[kjNumberStepper]` on sibling buttons (typically inside a
 * `[kjNumberInputGroup]`) to add increment / decrement triggers with
 * long-press auto-repeat.
 *
 * @example
 * ```html
 * <input kjNumberInput [(kjValue)]="qty" [kjMin]="0" [kjMax]="100" [kjStep]="1" />
 * ```
 * @doc
 *  @doc-example Default
 *    @doc-file number-input.example.ts
 *  @doc-example With stepper buttons
 *    @doc-file number-input.with-stepper.example.ts
 *  @doc-example Min / max / step
 *    @doc-file number-input.min-max.example.ts
 *  @doc-example Decimal precision
 *    @doc-file number-input.decimal.example.ts
 *  @doc-example Currency formatting
 *    @doc-file number-input.currency.example.ts
 * @category Core/Inputs
 * @doc-name number-input
 * @doc-description Enhances a native `<input>` with numeric-spinbutton semantics — bounded min/max/step, Arrow/Page/Home/End key steps, locale-aware display formatting, and the full WAI-ARIA spinbutton contract.
 * @doc-is-main
 */
@Directive({
  selector: '[kjNumberInput]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  providers: [{ provide: KJ_NUMBER_INPUT, useExisting: KjNumberInput }],
  exportAs: 'kjNumberInput',
  host: {
    '[attr.role]': '"spinbutton"',
    '[attr.type]': 'kjUseNativeNumber() ? "number" : "text"',
    '[attr.inputmode]': 'inputMode()',
    '[attr.id]': 'inputId()',
    '[attr.aria-valuemin]': 'isFiniteMin() ? kjMin() : null',
    '[attr.aria-valuemax]': 'isFiniteMax() ? kjMax() : null',
    '[attr.aria-valuenow]': 'kjValue() ?? null',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-invalid]': 'ariaInvalid()',
    '[attr.aria-readonly]': 'kjReadonly() ? "true" : null',
    '[attr.readonly]': 'kjReadonly() ? "" : null',
    '[attr.disabled]': 'formCtrl.disabled() ? "" : null',
    '[attr.aria-label]': 'kjAriaLabel()',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjNumberInput implements KjNumberInputContext {
  /** @internal */
  readonly formCtrl = inject(KjFormControl);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly localeId = inject(LOCALE_ID);
  private readonly group = inject(KjNumberInputGroup, { optional: true, skipSelf: true });

  /** Two-way bindable numeric model. `null` for empty. */
  readonly kjValue = model<number | null>(null);

  /** Minimum allowed value. `undefined` → unbounded (`-Infinity`). */
  readonly kjMin = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Maximum allowed value. `undefined` → unbounded (`+Infinity`). */
  readonly kjMax = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Step amount for ArrowUp / ArrowDown / stepper presses. */
  readonly kjStep = input<number, unknown>(1, { transform: numberAttribute });

  /** PageUp / PageDown amount. Defaults to `kjStep * 10` if `undefined`. */
  readonly kjPageStep = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Lattice base for snap-to-step. Defaults to `kjMin` if defined, else `0`. */
  readonly kjStepBase = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** When `false`, blur on empty snaps to `clamp(0, kjMin, kjMax)`. */
  readonly kjAllowEmpty = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** When `false`, the decimal separator is rejected on type. */
  readonly kjAllowDecimals = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** When `false`, the sign character is rejected and `kjMin` is floored at `0`. */
  readonly kjAllowNegative = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Read-only state. Reflects `aria-readonly` and `[readonly]`. */
  readonly kjReadonly = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** External invalid signal. OR'd with bounds + form invalidity for `aria-invalid`. */
  readonly kjInvalid = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Opts into native `<input type="number">` mode. Disables the mask + locale formatting. */
  readonly kjUseNativeNumber = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Drives `Intl.NumberFormat` style. Ignored when `kjUseNativeNumber=true`. */
  readonly kjFormat = input<'decimal' | 'currency' | 'percent' | 'unit'>('decimal');

  /** BCP-47 tag. Falls back to the injected `LOCALE_ID`. */
  readonly kjLocale = input<string | undefined>(undefined);

  /** ISO 4217 code (e.g. `'USD'`). Required when `kjFormat="currency"`. */
  readonly kjCurrency = input<string | undefined>(undefined);

  /** Currency display mode. */
  readonly kjCurrencyDisplay = input<'symbol' | 'narrowSymbol' | 'code' | 'name'>('symbol');

  /** Unit identifier (e.g. `'kilometer'`). Required when `kjFormat="unit"`. */
  readonly kjUnit = input<string | undefined>(undefined);

  /** Unit display mode. */
  readonly kjUnitDisplay = input<'short' | 'long' | 'narrow'>('short');

  /** Whether to use thousands grouping in the formatted display. */
  readonly kjUseGrouping = input<boolean, unknown>(true, { transform: booleanAttribute });

  /** Minimum fraction digits forwarded to `Intl.NumberFormat`. */
  readonly kjMinimumFractionDigits = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Maximum fraction digits forwarded to `Intl.NumberFormat`. */
  readonly kjMaximumFractionDigits = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Minimum integer digits forwarded to `Intl.NumberFormat`. */
  readonly kjMinimumIntegerDigits = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Minimum significant digits forwarded to `Intl.NumberFormat`. */
  readonly kjMinimumSignificantDigits = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Maximum significant digits forwarded to `Intl.NumberFormat`. */
  readonly kjMaximumSignificantDigits = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  /** Forwarded to `[attr.aria-label]`. */
  readonly kjAriaLabel = input<string | null>(null);

  // ── Internal state ────────────────────────────────────────────────────────

  private readonly editing = signal(false);
  private readonly _id = `kj-number-${++nextId}`;

  /** Computed effective minimum (number; `-Infinity` if unbounded). */
  readonly min = computed(() => {
    const explicit = this.kjMin();
    const base = explicit === undefined ? -Infinity : explicit;
    return this.kjAllowNegative() ? base : Math.max(0, base);
  });

  /** Computed effective maximum (number; `+Infinity` if unbounded). */
  readonly max = computed(() => {
    const explicit = this.kjMax();
    return explicit === undefined ? Infinity : explicit;
  });

  readonly step = computed(() => this.kjStep());
  readonly pageStep = computed(() => this.kjPageStep() ?? this.kjStep() * 10);
  readonly disabled = computed(() => this.formCtrl.disabled());
  readonly readonly = computed(() => this.kjReadonly());

  /** @internal */
  readonly value = this.kjValue.asReadonly();

  protected readonly isFiniteMin = computed(() => Number.isFinite(this.min()));
  protected readonly isFiniteMax = computed(() => Number.isFinite(this.max()));

  protected readonly inputId = computed(() => this.el.nativeElement.id || this._id);

  protected readonly inputMode = computed(() => {
    if (this.kjUseNativeNumber()) return null;
    if (this.kjFormat() === 'decimal' && !this.kjAllowDecimals()) return 'numeric';
    return 'decimal';
  });

  /** Formatter options derived from the public inputs. */
  private readonly formatOptions = computed<KjNumberFormatOptions>(() => ({
    locale: this.kjLocale() ?? this.localeId,
    format: this.kjFormat(),
    currency: this.kjCurrency(),
    currencyDisplay: this.kjCurrencyDisplay(),
    unit: this.kjUnit(),
    unitDisplay: this.kjUnitDisplay(),
    useGrouping: this.kjUseGrouping(),
    minimumFractionDigits: this.kjMinimumFractionDigits(),
    maximumFractionDigits: this.kjMaximumFractionDigits(),
    minimumIntegerDigits: this.kjMinimumIntegerDigits(),
    minimumSignificantDigits: this.kjMinimumSignificantDigits(),
    maximumSignificantDigits: this.kjMaximumSignificantDigits(),
  }));

  /** Out-of-range when the value falls outside [min, max]. Used for `aria-invalid`. */
  protected readonly outOfRange = computed(() => {
    const v = this.kjValue();
    if (v == null) return false;
    return v < this.min() || v > this.max();
  });

  protected readonly ariaInvalid = computed(() => {
    const touched = this.formCtrl.touched();
    const invalid = this.kjInvalid() || this.outOfRange();
    return touched && invalid ? 'true' : null;
  });

  protected readonly ariaValueText = computed(() => {
    const v = this.kjValue();
    if (v == null) return null;
    return formatNumber(v, this.formatOptions());
  });

  constructor() {
    // Register with an enclosing group so sibling steppers can find us.
    this.group?.register(this);

    // Bridge the model ↔ KjFormControl value so reactive forms see numeric values.
    effect(() => {
      const cvaValue = this.formCtrl.value();
      if (cvaValue === undefined) return;
      const num = cvaValue == null ? null : typeof cvaValue === 'number' ? cvaValue : parseNumber(String(cvaValue), this.formatOptions());
      if (num !== this.kjValue()) this.kjValue.set(num);
    });

    // Reflect the numeric model back to the native input — formatted when not editing,
    // raw-edit form when editing or when in native-number mode.
    effect(() => {
      const value = this.kjValue();
      const editing = this.editing();
      const native = this.kjUseNativeNumber();
      const el = this.el.nativeElement;
      if (value == null) {
        if (el.value !== '') el.value = '';
        return;
      }
      let next: string;
      if (native) {
        next = String(value);
      } else if (editing) {
        // Percent: the user thinks of `50` even though we store `0.5`.
        const display = this.kjFormat() === 'percent' ? value * 100 : value;
        next = formatForEdit(display, this.kjLocale() ?? this.localeId);
      } else {
        next = formatNumber(value, this.formatOptions());
      }
      if (el.value !== next) el.value = next;
    });

    // Clamp the value when min/max change at runtime.
    effect(() => {
      const v = this.kjValue();
      if (v == null) return;
      const min = this.min();
      const max = this.max();
      if (v < min || v > max) {
        const clamped = clamp(v, min, max);
        if (clamped !== v) {
          this.kjValue.set(clamped);
          this.formCtrl.notifyChange(clamped);
        }
      }
    });
  }

  // ── KjNumberInputContext ──────────────────────────────────────────────────

  /** @internal */
  stepBy(units: number, amount?: number): void {
    if (this.kjReadonly() || this.formCtrl.disabled()) return;
    const stepAmount = amount ?? this.kjStep();
    const current = this.kjValue() ?? this.fallbackForStep();
    const base = this.kjStepBase() ?? (this.kjMin() ?? 0);
    const next = snapToStep(current + units * stepAmount, stepAmount, base);
    this.commit(clamp(next, this.min(), this.max()));
  }

  /** @internal */
  setValue(value: number | null): void {
    if (value == null) {
      this.commit(null);
      return;
    }
    const base = this.kjStepBase() ?? (this.kjMin() ?? 0);
    const snapped = snapToStep(value, this.kjStep(), base);
    this.commit(clamp(snapped, this.min(), this.max()));
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  /** @internal */
  onFocus(): void {
    if (this.kjUseNativeNumber()) return;
    this.editing.set(true);
  }

  /** @internal */
  onBlur(): void {
    this.editing.set(false);
    this.formCtrl.notifyTouched();
    // Commit current edit buffer.
    const raw = this.el.nativeElement.value;
    if (raw === '' || raw == null) {
      if (this.kjAllowEmpty()) {
        this.commit(null);
      } else {
        this.commit(clamp(0, this.min(), this.max()));
      }
      return;
    }
    const parsed = this.kjUseNativeNumber()
      ? Number(raw)
      : parseNumber(raw, this.formatOptions());
    if (parsed == null || !Number.isFinite(parsed)) {
      this.commit(null);
      return;
    }
    this.commit(clamp(parsed, this.min(), this.max()));
  }

  /** @internal */
  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    // While editing we keep the model in sync so `aria-valuenow` updates with typing.
    if (this.kjUseNativeNumber()) {
      const n = raw === '' ? null : Number(raw);
      const next = n != null && Number.isFinite(n) ? n : null;
      this.kjValue.set(next);
      this.formCtrl.notifyChange(next);
      return;
    }
    const parsed = parseNumber(raw, this.formatOptions());
    this.kjValue.set(parsed);
    this.formCtrl.notifyChange(parsed);
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    if (this.kjReadonly() || this.formCtrl.disabled()) return;
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.stepBy(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.stepBy(-1);
        break;
      case 'PageUp':
        event.preventDefault();
        this.stepBy(1, this.pageStep());
        break;
      case 'PageDown':
        event.preventDefault();
        this.stepBy(-1, this.pageStep());
        break;
      case 'Home':
        if (Number.isFinite(this.min())) {
          event.preventDefault();
          this.commit(this.min());
        }
        break;
      case 'End':
        if (Number.isFinite(this.max())) {
          event.preventDefault();
          this.commit(this.max());
        }
        break;
      default:
        if (this.kjUseNativeNumber()) return;
        // Character filter: drop disallowed chars (decimal, sign) when restricted.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          if (event.key === '.' || event.key === ',') {
            if (!this.kjAllowDecimals()) event.preventDefault();
          } else if (event.key === '-' || event.key === '+') {
            if (!this.kjAllowNegative()) event.preventDefault();
          }
        }
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private commit(next: number | null): void {
    if (next === this.kjValue()) {
      // Still re-render the formatted display in case the editing buffer drifted.
      this.refreshDisplay();
      return;
    }
    this.kjValue.set(next);
    this.formCtrl.notifyChange(next);
  }

  private refreshDisplay(): void {
    const el = this.el.nativeElement;
    const value = this.kjValue();
    if (value == null) {
      el.value = '';
      return;
    }
    if (this.kjUseNativeNumber()) {
      el.value = String(value);
      return;
    }
    el.value = this.editing()
      ? formatForEdit(this.kjFormat() === 'percent' ? value * 100 : value, this.kjLocale() ?? this.localeId)
      : formatNumber(value, this.formatOptions());
  }

  private fallbackForStep(): number {
    const min = this.min();
    if (Number.isFinite(min)) return min;
    const max = this.max();
    if (Number.isFinite(max)) return max;
    return 0;
  }
}

function optionalNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}
