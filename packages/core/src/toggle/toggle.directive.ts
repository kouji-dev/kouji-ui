import { Directive, model } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/**
 * Adds toggle (press) behavior to a button. Manages `aria-pressed`.
 * @example
 * ```html
 * <button kjToggle [(kjPressed)]="isBold">B</button>
 * ```
 */
@Directive({
  selector: '[kjToggle]', standalone: true,
  hostDirectives: [{ directive: KjDisabledDirective, inputs: ['kjDisabled'] }, KjFocusRingDirective],
  host: { '[attr.aria-pressed]': 'kjPressed().toString()', '[attr.data-pressed]': 'kjPressed() ? "" : null', '(click)': 'toggle()' },
})
export class KjToggleDirective {
  /** Whether the toggle is pressed. */
  kjPressed = model<boolean>(false);
  toggle(): void { this.kjPressed.set(!this.kjPressed()); }
}
