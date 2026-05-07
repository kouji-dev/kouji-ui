import { Directive, Signal, computed, signal } from '@angular/core';
import { KJ_NUMBER_INPUT, KjNumberInputContext } from './number-input.context';

/**
 * Layout container for `[kjNumberInput]` + `[kjNumberStepper]`.
 *
 * Acts as a *context bridge*: the group provides `KJ_NUMBER_INPUT`, the
 * `[kjNumberInput]` registers itself with the group on construction, and
 * sibling `[kjNumberStepper]` directives inject the group's context to find
 * the input. This lets steppers and the input live as DOM siblings while
 * still sharing state via DI.
 *
 * Without the group the input still publishes the context to its own
 * descendants, but stepper buttons that are not descendants of the `<input>`
 * (almost always the case) need the group as their common ancestor.
 *
 * @example
 * ```html
 * <div kjNumberInputGroup>
 *   <button kjNumberStepper kjStep="down" aria-label="Decrease">−</button>
 *   <input kjNumberInput [(kjValue)]="qty" />
 *   <button kjNumberStepper kjStep="up" aria-label="Increase">+</button>
 * </div>
 * ```
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjNumberInputGroup]',
  standalone: true,
  providers: [{ provide: KJ_NUMBER_INPUT, useExisting: KjNumberInputGroup }],
  host: {
    'role': 'group',
  },
})
export class KjNumberInputGroup implements KjNumberInputContext {
  private readonly registered = signal<KjNumberInputContext | null>(null);

  /** Called by `[kjNumberInput]` from its constructor. @internal */
  register(input: KjNumberInputContext): void {
    this.registered.set(input);
  }

  // ── Forward each context member through to the registered input ──────────
  // While no input is registered, the signals fall back to safe sentinel
  // values; steppers inside an empty group are simply inert.

  readonly value: Signal<number | null> = computed(() => this.registered()?.value() ?? null);
  readonly min: Signal<number> = computed(() => this.registered()?.min() ?? -Infinity);
  readonly max: Signal<number> = computed(() => this.registered()?.max() ?? Infinity);
  readonly step: Signal<number> = computed(() => this.registered()?.step() ?? 1);
  readonly pageStep: Signal<number> = computed(() => this.registered()?.pageStep() ?? 10);
  readonly disabled: Signal<boolean> = computed(() => this.registered()?.disabled() ?? false);
  readonly readonly: Signal<boolean> = computed(() => this.registered()?.readonly() ?? false);

  stepBy(units: number, amount?: number): void {
    this.registered()?.stepBy(units, amount);
  }

  setValue(value: number | null): void {
    this.registered()?.setValue(value);
  }
}
