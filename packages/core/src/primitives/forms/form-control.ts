import { Directive, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Shared ControlValueAccessor primitive. Compose via `hostDirectives` on any
 * form input directive (KjInput, KjCheckbox, etc.) to wire
 * Angular reactive forms and template-driven forms automatically.
 *
 * The host directive calls `notifyChange(value)` on user input and
 * `notifyTouched()` on blur. The directive handles all CVA plumbing.
 *
 * @example
 * ```ts
 * @Directive({
 *   selector: '[kjInput]',
 *   hostDirectives: [KjFormControl],
 *   host: {
 *     '(input)': 'formCtrl.notifyChange($event.target.value)',
 *     '(blur)':  'formCtrl.notifyTouched()',
 *   },
 * })
 * export class KjInput {
 *   readonly formCtrl = inject(KjFormControl);
 * }
 * ```
 * @doc-category Core/Primitives
 * @doc
 * @doc-name forms
 * @doc-description Wires any input directive into Angular reactive and template-driven forms.
 * @doc-is-main
 */
@Directive({
  selector: '[kjFormControl]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KjFormControl),
      multi: true,
    },
  ],
})
export class KjFormControl implements ControlValueAccessor {
  /** The current form value, kept in sync with the Angular forms model. */
  readonly value = signal<unknown>(undefined);

  /** Whether the control is disabled by the Angular forms layer. */
  readonly disabled = signal<boolean>(false);

  /** Whether the control has been touched (blurred at least once). */
  readonly touched = signal<boolean>(false);

  private _onChange?: (value: unknown) => void;
  private _onTouched?: () => void;
  private _writeListeners?: Set<(value: unknown) => void>;
  private _delegate: KjFormControl | null = null;
  private _toInner?: (value: unknown) => unknown;
  private _wrote = false;

  /** @internal — called by Angular forms */
  writeValue(val: unknown): void {
    this._wrote = true;
    this.value.set(val);
    this._delegate?.writeValue(this._toInner ? this._toInner(val) : val);
    if (this._writeListeners) for (const fn of this._writeListeners) fn(val);
  }

  /** @internal — called by Angular forms */
  registerOnChange(fn: (value: unknown) => void): void {
    this._onChange = fn;
  }

  /** @internal — called by Angular forms */
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  /** @internal — called by Angular forms */
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    this._delegate?.setDisabledState(isDisabled);
  }

  /**
   * Run `fn` **synchronously** every time Angular's forms layer writes a value
   * (`writeValue`), including the write that seeds the control.
   *
   * Prefer the {@link value} signal. Reach for this only when the write has to
   * land before the next change-detection pass — an editor whose document has
   * to be replaced in the same turn, for example — which an `effect()` on
   * {@link value} cannot promise.
   *
   * @param fn - Receives the value Angular just wrote.
   */
  onWriteValue(fn: (value: unknown) => void): void {
    (this._writeListeners ??= new Set()).add(fn);
  }

  /**
   * Forward every forms interaction to the `KjFormControl` on the element that
   * actually paints the control.
   *
   * A styled wrapper (`<kj-input>`, `<kj-color-picker>`, `<kj-input-otp>`) is
   * the element a consumer binds `[(ngModel)]` / `[formControl]` to, but the
   * real control is the headless directive in the wrapper's view. Composing
   * `KjFormControl` on the wrapper's host and calling `delegateTo(inner)` once
   * the view query resolves joins the two: values written before the view
   * exists are replayed, and the inner control's `notifyChange` /
   * `notifyTouched` reach the consumer's form.
   *
   * Idempotent, so it is safe to call from an `effect()` on the view query.
   *
   * @param target - The inner control, or `undefined` while the view query is unresolved.
   * @param options - `toInner` normalises each value on its way to the inner
   *   control (an OTP maps `null` to `''` so a cleared form empties the cells);
   *   the outer {@link value} signal, which is the consumer's form value, keeps
   *   what Angular wrote.
   */
  delegateTo(
    target: KjFormControl | null | undefined,
    options?: { readonly toInner?: (value: unknown) => unknown },
  ): void {
    if (!target || target === this._delegate || target === this) return;
    this._delegate = target;
    this._toInner = options?.toInner;
    target.registerOnChange((v) => {
      this.value.set(v);
      this._onChange?.(v);
    });
    target.registerOnTouched(() => {
      this.touched.set(true);
      this._onTouched?.();
    });
    if (this._wrote) target.writeValue(this._toInner ? this._toInner(this.value()) : this.value());
    if (this.disabled()) target.setDisabledState(true);
  }

  /**
   * Call this when the user changes the control's value.
   * Updates the value signal and notifies Angular forms.
   * @param val - The new value.
   */
  notifyChange(val: unknown): void {
    this.value.set(val);
    this._onChange?.(val);
  }

  /**
   * Call this when the user blurs the control.
   * Marks the control as touched.
   */
  notifyTouched(): void {
    this.touched.set(true);
    this._onTouched?.();
  }
}
