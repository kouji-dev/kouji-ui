import { Directive, computed, inject, model } from '@angular/core';
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
  private readonly disabledState = inject(KjDisabled);

  /**
   * Whether the toggle is pressed. Supports two-way binding. Defaults to `false`.
   *
   * Angular's `model()` accepts no `transform`, so the bare-attribute form
   * (`<button kjToggle kjPressed>`) binds the empty string and reads as
   * `false`. Bind it: `[(kjPressed)]="on"` or `[kjPressed]="true"`.
   */
  kjPressed = model<boolean>(false);

  /**
   * Whether interaction is blocked — either by `[kjDisabled]` or by an Angular
   * form control that was disabled through `FormControl.disable()`.
   */
  readonly isDisabled = computed(
    () => this.disabledState.disabled() || this.formCtrl.disabled(),
  );

  /** @internal */
  toggle(): void {
    // A control announcing aria-disabled must not change state when clicked
    // (WCAG 4.1.2 — the announced state has to match the behaviour).
    if (this.isDisabled()) return;
    const next = !this.kjPressed();
    this.kjPressed.set(next);
    this.formCtrl.notifyChange(next);
  }
}
