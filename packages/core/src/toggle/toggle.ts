import { Directive, inject, model } from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';

/**
 * Adds toggle (press) behavior with Angular forms integration.
 *
 * @example
 * ```html
 * <button kjToggle [(kjPressed)]="isBold" aria-label="Bold">B</button>
 * ```
 * @category Core/Inputs/Toggle
 */
@Directive({
  selector: '[kjToggle]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
  ],
  host: {
    '[attr.aria-pressed]': 'kjPressed().toString()',
    '[attr.data-pressed]': 'kjPressed() ? "" : null',
    '(click)': 'toggle()',
    '(blur)': 'formCtrl.notifyTouched()',
  },
})
export class KjToggle {
  readonly formCtrl = inject(KjFormControl);

  /** Whether the toggle is pressed. Supports two-way binding. */
  kjPressed = model<boolean>(false);

  /** @internal */
  toggle(): void {
    const next = !this.kjPressed();
    this.kjPressed.set(next);
    this.formCtrl.notifyChange(next);
  }
}
