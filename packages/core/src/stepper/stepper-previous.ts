import {
  Directive,
  computed,
} from '@angular/core';
import {
  KJ_STEPPER,
} from './stepper.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Stepper-level *Previous* command. Apply to a `<button>`. Host-binds
 * `[disabled]` from the parent's `canRetreat()`, and dispatches `previous()` on click.
 *
 * @example `<button kjStepperPrevious>Back</button>`
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStepperPrevious]',
  standalone: true,
  host: {
    '[attr.disabled]': 'isDisabled()',
    '[attr.aria-disabled]': 'isDisabled() !== null ? "true" : null',
    '[attr.data-stepper-action]': '"previous"',
    '(click)': 'onClick()',
  },
})
export class KjStepperPrevious {
  private readonly stepper = injectParent(KJ_STEPPER, { child: 'KjStepperPrevious', parent: '[kjStepper]' });

  /** @internal */
  readonly isDisabled = computed(() => (this.stepper.canRetreat() ? null : ''));

  /** @internal */
  onClick(): void {
    this.stepper.previous();
  }
}
