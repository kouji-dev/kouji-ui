import {
  Directive,
  Signal,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  KJ_STEP,
  KJ_STEPPER,
  KjStepContext,
} from './stepper.context';
import { KjId } from '../primitives/overlay/id';
import { injectParent } from '../primitives/diagnostics/inject-parent';
import {  } from './stepper-root';

/**
 * Individual step within a {@link KjStepper}. Registers with the parent on
 * construction, exposes per-step state (`completed`, `error`, `optional`,
 * `disabled`, `reachable`, `active`) via {@link KJ_STEP}, and host-binds
 * `aria-current="step"` when active.
 *
 * @example
 * ```html
 * <li kjStep [kjStepCompleted]="form.valid()" [kjStepError]="form.invalid() && form.touched()">
 *   <button kjStepLabel>Profile</button>
 *   <section kjStepContent>...</section>
 * </li>
 * ```
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStep]',
  standalone: true,
  exportAs: 'kjStep',
  providers: [{ provide: KJ_STEP, useExisting: KjStep }],
  host: {
    // No `role` override — applied to an `<li>`, the native `listitem`
    // semantics already apply, and forcing the role would orphan the item
    // when the step lives inside a non-`<ol>` parent (rare but possible).
    '[attr.aria-current]': 'active() ? "step" : null',
    '[attr.data-active]': 'active() ? "true" : null',
    '[attr.data-completed]': 'completed() ? "true" : null',
    '[attr.data-error]': 'error() ? "true" : null',
    '[attr.data-optional]': 'optional() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "true" : null',
    '[attr.data-reachable]': 'reachable() ? "true" : null',
    '[attr.data-step-index]': 'index()',
  },
})
export class KjStep implements KjStepContext {
  private readonly stepper = injectParent(KJ_STEPPER, { child: 'KjStep', parent: '[kjStepper]' });

  /** Marks the step as completed. Drives `data-completed` and gates linear advancement. Defaults to `false`. */
  readonly kjStepCompleted = input(false, { transform: booleanAttribute });

  /** Marks the step as in error. Drives `data-error`. Does *not* block advancement on its own. Defaults to `false`. */
  readonly kjStepError = input(false, { transform: booleanAttribute });

  /** Marks the step as optional — permits linear advancement without `completed`. Defaults to `false`. */
  readonly kjStepOptional = input(false, { transform: booleanAttribute });

  /** Explicit per-step disable, independent of linear-mode reachability. Defaults to `false`. */
  readonly kjStepDisabled = input(false, { transform: booleanAttribute });

  /** Optional human-meaningful key for `goToKey()` / analytics. */
  readonly kjStepKey = input<string | undefined>(undefined);

  private readonly _stepId = inject(KjId).mint('step');

  /** 0-based index in the parent stepper's step list. */
  readonly index: Signal<number> = computed(() => this.stepper.steps().indexOf(this));

  /** True when this is the active step. */
  readonly active: Signal<boolean> = computed(
    () => this.stepper.activeStep() === this.index(),
  );

  /** Mirror of the `kjStepCompleted` input as a signal. */
  readonly completed: Signal<boolean> = computed(() => this.kjStepCompleted());

  /** Mirror of the `kjStepError` input as a signal. */
  readonly error: Signal<boolean> = computed(() => this.kjStepError());

  /** Mirror of the `kjStepOptional` input as a signal. */
  readonly optional: Signal<boolean> = computed(() => this.kjStepOptional());

  /** Mirror of the `kjStepDisabled` input as a signal. */
  readonly disabled: Signal<boolean> = computed(() => this.kjStepDisabled());

  /** Mirror of the `kjStepKey` input as a signal. */
  readonly key: Signal<string | undefined> = computed(() => this.kjStepKey());

  /** True when this step is reachable under the current mode (always true non-linear). */
  readonly reachable: Signal<boolean> = computed(() => {
    if (this.disabled()) return false;
    return this.stepper.isReachable(this.index());
  });

  /** Stable id for `aria-labelledby` wiring. */
  readonly labelId: Signal<string> = computed(
    () => `${this._stepId}-label`,
  );

  /** Stable id for the content region. */
  readonly contentId: Signal<string> = computed(
    () => `${this._stepId}-content`,
  );

  constructor() {
    this.stepper.register(this);
  }

  /** Activate this step. Subject to linear-mode gating. */
  activate(): void {
    if (this.disabled()) return;
    this.stepper.goTo(this.index());
  }
}
