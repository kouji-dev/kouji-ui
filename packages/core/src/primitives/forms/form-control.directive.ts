import { Directive, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Shared ControlValueAccessor primitive. Compose via `hostDirectives` on any
 * form input directive (KjInputDirective, KjCheckboxDirective, etc.) to wire
 * Angular reactive forms and template-driven forms automatically.
 *
 * The host directive calls `notifyChange(value)` on user input and
 * `notifyTouched()` on blur. The directive handles all CVA plumbing.
 *
 * @example
 * ```ts
 * @Directive({
 *   selector: '[kjInput]',
 *   hostDirectives: [KjFormControlDirective],
 *   host: {
 *     '(input)': 'formCtrl.notifyChange($event.target.value)',
 *     '(blur)':  'formCtrl.notifyTouched()',
 *   },
 * })
 * export class KjInputDirective {
 *   readonly formCtrl = inject(KjFormControlDirective);
 * }
 * ```
 * @category Primitives/FormControl
 */
@Directive({
  selector: '[kjFormControl]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KjFormControlDirective),
      multi: true,
    },
  ],
})
export class KjFormControlDirective implements ControlValueAccessor {
  /** The current form value, kept in sync with the Angular forms model. */
  readonly value = signal<unknown>(undefined);

  /** Whether the control is disabled by the Angular forms layer. */
  readonly disabled = signal<boolean>(false);

  /** Whether the control has been touched (blurred at least once). */
  readonly touched = signal<boolean>(false);

  private _onChange?: (value: unknown) => void;
  private _onTouched?: () => void;

  /** @internal — called by Angular forms */
  writeValue(val: unknown): void {
    this.value.set(val);
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
