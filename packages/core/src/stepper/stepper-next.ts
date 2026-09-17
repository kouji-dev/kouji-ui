import {
  Directive,
  computed,
} from '@angular/core';
import {
  KJ_STEPPER,
} from './stepper.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Stepper-level *Next* command. Apply to a `<button>`. Host-binds
 * `[disabled]` from the parent's `canAdvance()`, and dispatches `next()` on click.
 *
 * @example `<button kjStepperNext>Continue</button>`
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStepperNext]',
  standalone: true,
  host: {
    '[attr.disabled]': 'isDisabled()',
    '[attr.aria-disabled]': 'isDisabled() !== null ? "true" : null',
    '[attr.data-stepper-action]': '"next"',
    '(click)': 'onClick()',
  },
})
export class KjStepperNext {
  private readonly stepper = injectParent(KJ_STEPPER, { child: 'KjStepperNext', parent: '[kjStepper]' });

  /** @internal */
  readonly isDisabled = computed(() => (this.stepper.canAdvance() ? null : ''));

  /** @internal */
  onClick(): void {
    this.stepper.next();
  }
}
