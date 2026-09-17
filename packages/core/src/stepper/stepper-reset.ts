import {
  Directive,
} from '@angular/core';
import {
  KJ_STEPPER,
} from './stepper.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Stepper-level *Reset* command. Apply to a `<button>`. Dispatches
 * `reset()` on click; never gated.
 *
 * @example `<button kjStepperReset>Start over</button>`
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStepperReset]',
  standalone: true,
  host: {
    '[attr.data-stepper-action]': '"reset"',
    '(click)': 'onClick()',
  },
})
export class KjStepperReset {
  private readonly stepper = injectParent(KJ_STEPPER, { child: 'KjStepperReset', parent: '[kjStepper]' });

  /** @internal */
  onClick(): void {
    this.stepper.reset();
  }
}
