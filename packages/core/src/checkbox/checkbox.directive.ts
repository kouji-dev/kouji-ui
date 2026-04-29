import { Directive, model } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/**
 * Adds checkbox semantics to any element. Manages `aria-checked` state.
 * @example
 * ```html
 * <div kjCheckbox tabindex="0" [(kjChecked)]="accepted" aria-label="Accept">Accept</div>
 * ```
 */
@Directive({
  selector: '[kjCheckbox]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    role: 'checkbox',
    '[attr.aria-checked]': 'kjChecked().toString()',
    '[attr.data-checked]': 'kjChecked() ? "" : null',
    '(click)': 'toggle()',
    '(keydown.space)': 'onSpace($event)',
  },
})
export class KjCheckboxDirective {
  /** Whether the checkbox is checked. Supports two-way binding. */
  kjChecked = model<boolean>(false);

  /** @internal */
  toggle(): void { this.kjChecked.set(!this.kjChecked()); }

  /** @internal */
  onSpace(e: Event): void { e.preventDefault(); this.toggle(); }
}
