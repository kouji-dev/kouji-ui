import { Directive, inject, model } from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';

/**
 * Adds toggle (press) behavior with Angular forms integration.
 *
 * Reflects `aria-pressed` and `data-pressed` and integrates with reactive and
 * template-driven forms so the pressed state participates as a regular form
 * value alongside other inputs.
 *
 * @example
 * ```html
 * <button kjToggle [(kjPressed)]="isBold" aria-label="Bold">B</button>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name toggle
 * @doc-description Adds press/unpress toggle behaviour to any focusable element with Angular forms support.
 * @doc-is-main
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
