import { Directive, input } from '@angular/core';
import { KjDisabledDirective } from '../primitives/disabled.directive';
import { KjFocusRingDirective } from '../primitives/focus-ring.directive';

/**
 * Enhances a native `<input>` with disabled and invalid state via ARIA and data attributes.
 * @example
 * ```html
 * <input kjInput type="email" [kjInvalid]="hasError()" [kjDisabled]="isLoading()" />
 * ```
 */
@Directive({
  selector: '[kjInput]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabledDirective, inputs: ['kjDisabled'] },
    KjFocusRingDirective,
  ],
  host: {
    '[attr.aria-invalid]': 'kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'kjInvalid() ? "" : null',
  },
})
export class KjInputDirective {
  /** Whether the input is in an invalid state. */
  kjInvalid = input<boolean>(false);
}
