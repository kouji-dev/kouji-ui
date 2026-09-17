import {
  Directive,
  Injector,
  Signal,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import {
  KJ_ROVING_ORIENTATION_DEFAULT,
  KjRovingOrientation,
  KjRovingTabindex,
} from '../a11y/roving-tabindex';
import {
  KJ_STEPPER,
  KjStepContext,
  KjStepperContext,
} from './stepper.context';
import { KjId } from '../primitives/overlay/id';

// TODO(progress-bar): when the Progress Bar primitive lands at
// `packages/core/src/feedback/progress-bar/`, expose `progressFraction()`
// and `progressLabel()` computed signals on `KjStepperComponent`-shaped
// wrappers. The directive layer here intentionally stays out of the
// progress-bar composition — that's a wrapper concern.

/**
 * Root of the Stepper directive family. Owns the active-step state machine,
 * registers child `KjStep` directives, and provides {@link KJ_STEPPER}.
 *
 * Applied to an `<ol>`. Uses APG wizard semantics — `aria-current="step"`
 * on the active step, *not* `role="tablist"` / `aria-selected`.
 *
 * Roving tabindex is composed via {@link KjRovingTabindex}, whose arrow-key
 * axis is pinned to `kjOrientation` through `KJ_ROVING_ORIENTATION_DEFAULT`
 * — bound or not. When `kjArrowNavigation=false` the roving directive is
 * still applied but receives no items, so it is a no-op.
 *
 * @example
 * ```html
 * <ol kjStepper [(kjActiveStep)]="step">
 *   <li kjStep>
 *     <button kjStepLabel>Account</button>
 *     <section kjStepContent>...</section>
 *   </li>
 *   <li kjStep>
 *     <button kjStepLabel>Profile</button>
 *     <section kjStepContent>...</section>
 *   </li>
 *   <button kjStepperPrevious>Back</button>
 *   <button kjStepperNext>Continue</button>
 * </ol>
 * ```
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 * @doc-description Unstyled multi-step wizard root with active-step state, linear-mode gating, and keyboard navigation.
 * @doc-is-main
 */
@Directive({
  selector: '[kjStepper]',
  standalone: true,
  exportAs: 'kjStepper',
  hostDirectives: [KjRovingTabindex],
  providers: [
    { provide: KJ_STEPPER, useExisting: KjStepper },
    // Pin the roving primitive's axis to this stepper's own orientation.
    //
    // A `hostDirectives` input alias (`kjRovingOrientation: kjOrientation`)
    // only carries a *binding*, never a default — so `<ol kjStepper>` with no
    // `kjOrientation` left the primitive at `'both'` while the host reported
    // `data-orientation="horizontal"`, and ArrowUp/ArrowDown moved focus
    // across a horizontal strip. The token carries the effective value, bound
    // or not, and a `kjRovingOrientation` binding still wins over it.
    //
    // Resolved lazily: `KjRovingTabindex` is a host directive, so it is
    // constructed *before* `KjStepper`. The primitive only calls this getter
    // from its `orientation` computed, by which time the instance exists.
    {
      provide: KJ_ROVING_ORIENTATION_DEFAULT,
      useFactory: (): (() => KjRovingOrientation) => {
        const injector = inject(Injector);
        let ctx: KjStepperContext | null = null;
        return () => (ctx ??= injector.get(KJ_STEPPER)).orientation();
      },
    },
  ],
  host: {
    // No `role` override — `<ol>` carries `list` semantics natively. We do
    // not bind `aria-orientation` because `aria-allowed-attr` rejects it on
    // the implicit `list` role; the keyboard axis is enforced via
    // `KjRovingTabindex`'s `kjRovingOrientation` and themes read
    // `data-orientation` for visual layout.
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-linear]': 'linear() ? "true" : null',
    '[attr.data-active-step]': 'activeStep()',
  },
})
export class KjStepper implements KjStepperContext {
  /** Two-way bound active-step pointer (0-based). */
  readonly kjActiveStep = model<number>(0);

  /** Linear-mode flag. Linear gates forward jumps on prior-step completion. Defaults to `false`. */
  readonly kjLinear = input(false, { transform: booleanAttribute });

  /**
   * Stepper orientation. Drives `data-orientation` and the arrow-key axis of
   * the composed {@link KjRovingTabindex} (through
   * `KJ_ROVING_ORIENTATION_DEFAULT`), including when it is left unbound.
   */
  readonly kjOrientation = input<'horizontal' | 'vertical'>('horizontal');

  /** When true, `next()` from the last step wraps to 0; `previous()` from 0 wraps to last. Defaults to `false`. */
  readonly kjLoop = input(false, { transform: booleanAttribute });

  /** Whether `reset()` should also emit `(kjReset)` so consumers can clear per-step signals. Defaults to `false`. */
  readonly kjResetStepStates = input(false, { transform: booleanAttribute });

  /** Whether to enable arrow-key roving across step headers. Defaults to `true`. */
  readonly kjArrowNavigation = input(true, { transform: booleanAttribute });

  /** Stable id for this stepper instance, used to namespace step ids. */
  readonly stepperId = inject(KjId).mint('stepper');

  private readonly _steps = signal<readonly KjStepContext[]>([]);
  private readonly _navigationSource = signal<'click' | 'command' | 'programmatic'>(
    'programmatic',
  );

  /** @internal — read-only view of registered steps in registration order. */
  readonly steps = this._steps.asReadonly();

  /** @internal — read by `KjStepLabel` to decide focus behaviour. */
  readonly navigationSource = this._navigationSource.asReadonly();

  /** Active-step index (0-based). */
  readonly activeStep: Signal<number> = computed(() => this.kjActiveStep());

  /** Total registered step count. */
  readonly totalSteps: Signal<number> = computed(() => this._steps().length);

  /** Linear-mode flag (signal mirror). */
  readonly linear: Signal<boolean> = computed(() => this.kjLinear());

  /** Orientation (signal mirror). */
  readonly orientation: Signal<'horizontal' | 'vertical'> = computed(() =>
    this.kjOrientation(),
  );

  /** True when `next()` will succeed under the current mode and state. */
  readonly canAdvance: Signal<boolean> = computed(() => {
    const steps = this._steps();
    const total = steps.length;
    if (total === 0) return false;
    const idx = this.kjActiveStep();
    const atEnd = idx >= total - 1;
    if (atEnd && !this.kjLoop()) return false;
    if (!this.kjLinear()) return true;
    const current = steps[idx];
    if (!current) return false;
    return current.completed() || current.optional();
  });

  /** True when `previous()` will succeed. */
  readonly canRetreat: Signal<boolean> = computed(() => {
    const total = this.totalSteps();
    if (total === 0) return false;
    if (this.activeStep() > 0) return true;
    return this.kjLoop();
  });

  constructor() {
    // Two-way binding sync: clamp out-of-range writes silently. The clamped
    // value is in-range, so the effect re-runs once and stabilises.
    effect(() => {
      const v = this.kjActiveStep();
      const total = this.totalSteps();
      if (total === 0) return;
      if (v < 0) {
        this.kjActiveStep.set(0);
      } else if (v >= total) {
        this.kjActiveStep.set(total - 1);
      }
    });
  }

  /** @internal */
  register(step: KjStepContext): void {
    this._steps.update((steps) => [...steps, step]);
  }

  /** @internal */
  unregister(step: KjStepContext): void {
    this._steps.update((steps) => steps.filter((s) => s !== step));
  }

  /** @internal — reachability under linear gating. */
  isReachable(index: number): boolean {
    if (!this.kjLinear()) return true;
    const active = this.kjActiveStep();
    if (index <= active) return true;
    const steps = this._steps();
    // For any forward jump, every step strictly before `index` must be
    // completed or optional. This subsumes the "+1" case (only the active
    // step matters then, since steps before it are necessarily completed
    // in a well-formed linear flow — and if they aren't, the user can't
    // be there in the first place).
    for (let i = 0; i < index; i++) {
      const s = steps[i];
      if (!s) return false;
      if (!s.completed() && !s.optional()) return false;
    }
    return true;
  }

  /** Advance one step. No-op when `canAdvance()` is false. */
  next(): void {
    if (!this.canAdvance()) return;
    this._navigationSource.set('command');
    const total = this.totalSteps();
    const idx = this.activeStep();
    const nextIdx = idx >= total - 1 ? (this.kjLoop() ? 0 : idx) : idx + 1;
    this.kjActiveStep.set(nextIdx);
  }

  /** Retreat one step. No-op when `canRetreat()` is false. */
  previous(): void {
    if (!this.canRetreat()) return;
    this._navigationSource.set('command');
    const idx = this.activeStep();
    const total = this.totalSteps();
    const prevIdx = idx === 0 ? (this.kjLoop() ? total - 1 : 0) : idx - 1;
    this.kjActiveStep.set(prevIdx);
  }

  /** Jump to a specific index. Subject to linear-mode gating. */
  goTo(index: number): void {
    const total = this.totalSteps();
    if (total === 0) return;
    if (index < 0 || index >= total) return;
    if (!this.isReachable(index)) return;
    this._navigationSource.set('click');
    this.kjActiveStep.set(index);
  }

  /** Jump to the step whose `kjStepKey` matches. First match wins. */
  goToKey(key: string): void {
    const steps = this._steps();
    const idx = steps.findIndex((s) => s.key() === key);
    if (idx === -1) return;
    this.goTo(idx);
  }

  /** Reset to step 0. Consumer is responsible for clearing per-step state when `kjResetStepStates=true`. */
  reset(): void {
    this._navigationSource.set('command');
    this.kjActiveStep.set(0);
  }
}
