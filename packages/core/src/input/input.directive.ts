import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { KjDisabledDirective, KjFocusRingDirective, KjFormControlDirective } from '../primitives';

/**
 * Enhances a native `<input>` with Angular forms integration, disabled/invalid state, and focus-ring.
 * Supports `formControl`, `formControlName`, and `ngModel` bindings.
 *
 * @example
 * ```html
 * <input kjInput type="email" [formControl]="emailCtrl" [kjInvalid]="emailCtrl.invalid" />
 * ```
 * @category Foundation/Input
 */
@Directive({
  selector: '[kjInput]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['kjDisabled'] },
    KjFocusRingDirective,
    KjFormControlDirective,
  ],
  host: {
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'formCtrl.touched() && kjInvalid() ? "" : null',
    '[attr.disabled]': 'formCtrl.disabled() ? "" : null',
    '(input)': 'formCtrl.notifyChange($any($event.target).value)',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjInputDirective {
  readonly formCtrl = inject(KjFormControlDirective);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** Whether the input is in an invalid state. Combined with `touched` for ARIA. */
  kjInvalid = input<boolean>(false);

  constructor() {
    // Reflect the CVA value signal back to the native input element.
    effect(() => {
      const val = this.formCtrl.value();
      this.el.nativeElement.value = val == null ? '' : String(val);
    });
  }
}
