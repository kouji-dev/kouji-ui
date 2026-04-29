import { Directive, inject, model } from '@angular/core';
import { KjDisabledDirective, KjFocusRingDirective, KjFormControlDirective } from '../primitives';

/**
 * Adds checkbox semantics with Angular forms integration.
 * Supports `formControl`, `formControlName`, and `ngModel` bindings.
 *
 * @example
 * ```html
 * <div kjCheckbox tabindex="0" [(kjChecked)]="accepted" aria-label="Accept terms">Accept</div>
 * ```
 */
@Directive({
  selector: '[kjCheckbox]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['kjDisabled'] },
    KjFocusRingDirective,
    KjFormControlDirective,
  ],
  host: {
    role: 'checkbox',
    '[attr.aria-checked]': 'kjChecked().toString()',
    '[attr.data-checked]': 'kjChecked() ? "" : null',
    '[attr.disabled]': 'formCtrl.disabled() ? "" : null',
    '(click)': 'toggle()',
    '(keydown.space)': 'onSpace($event)',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjCheckboxDirective {
  readonly formCtrl = inject(KjFormControlDirective);

  /** Whether the checkbox is checked. Supports two-way binding. */
  kjChecked = model<boolean>(false);

  /** @internal */
  toggle(): void {
    const next = !this.kjChecked();
    this.kjChecked.set(next);
    this.formCtrl.notifyChange(next);
  }

  /** @internal */
  onSpace(e: Event): void { e.preventDefault(); this.toggle(); }
}
