import {
  Directive,
  ElementRef,
  Signal,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import {
  KjRovingTabindex,
  KjRovingTabindexItemDirective,
} from '../a11y/roving-tabindex';
import {
  KJ_STEP,
  KJ_STEPPER,
  KjStepContext,
  KjStepperContext,
} from './stepper.context';

// TODO(progress-bar): when the Progress Bar primitive lands at
// `packages/core/src/feedback/progress-bar/`, expose `progressFraction()`
// and `progressLabel()` computed signals on `KjStepperComponent`-shaped
// wrappers. The directive layer here intentionally stays out of the
// progress-bar composition — that's a wrapper concern.

let _stepperUid = 0;

/**
 * Root of the Stepper directive family. Owns the active-step state machine,
 * registers child `KjStep` directives, and provides {@link KJ_STEPPER}.
 *
 * Applied to an `<ol>`. Uses APG wizard semantics — `aria-current="step"`
 * on the active step, *not* `role="tablist"` / `aria-selected`.
 *
 * Roving tabindex is composed via {@link KjRovingTabindex} with the
 * orientation fed from `kjOrientation`. When `kjArrowNavigation=false`
 * the roving directive is still applied but receives no items, so it
 * is a no-op.
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
  hostDirectives: [
    {
      directive: KjRovingTabindex,
      inputs: ['kjRovingOrientation: kjOrientation'],
    },
  ],
  providers: [{ provide: KJ_STEPPER, useExisting: KjStepper }],
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

  /** Linear-mode flag. Linear gates forward jumps on prior-step completion. */
  readonly kjLinear = input<boolean>(false);

  /** Stepper orientation. Drives `aria-orientation` and the arrow-key axis. */
  readonly kjOrientation = input<'horizontal' | 'vertical'>('horizontal');

  /** When true, `next()` from the last step wraps to 0; `previous()` from 0 wraps to last. */
  readonly kjLoop = input<boolean>(false);

  /** Whether `reset()` should also emit `(kjReset)` so consumers can clear per-step signals. */
  readonly kjResetStepStates = input<boolean>(false);

  /** Whether to enable arrow-key roving across step headers. */
  readonly kjArrowNavigation = input<boolean>(true);

  /** Stable id for this stepper instance, used to namespace step ids. */
  readonly stepperId = `kj-stepper-${++_stepperUid}`;

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

let _stepUid = 0;

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
  private readonly stepper = inject(KJ_STEPPER) as KjStepper;

  /** Marks the step as completed. Drives `data-completed` and gates linear advancement. */
  readonly kjStepCompleted = input<boolean>(false);

  /** Marks the step as in error. Drives `data-error`. Does *not* block advancement on its own. */
  readonly kjStepError = input<boolean>(false);

  /** Marks the step as optional — permits linear advancement without `completed`. */
  readonly kjStepOptional = input<boolean>(false);

  /** Explicit per-step disable, independent of linear-mode reachability. */
  readonly kjStepDisabled = input<boolean>(false);

  /** Optional human-meaningful key for `goToKey()` / analytics. */
  readonly kjStepKey = input<string | undefined>(undefined);

  private readonly _uid = ++_stepUid;

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
    () => `${this.stepper.stepperId}-step-${this._uid}-label`,
  );

  /** Stable id for the content region. */
  readonly contentId: Signal<string> = computed(
    () => `${this.stepper.stepperId}-step-${this._uid}-content`,
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

/**
 * Marks an element as the *header* of its parent {@link KjStep}. Wires the
 * accessible id, `aria-controls`, `aria-disabled`, and the click handler.
 * Also acts as a roving-tabindex item, joining the parent stepper's
 * single-tab-stop header strip.
 *
 * Apply to `<button>` (the recommended host) or any focusable element.
 *
 * @example
 * ```html
 * <button kjStepLabel>Profile</button>
 * ```
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStepLabel]',
  standalone: true,
  hostDirectives: [KjRovingTabindexItemDirective],
  host: {
    '[attr.id]': 'step.labelId()',
    '[attr.aria-controls]': 'step.contentId()',
    '[attr.aria-disabled]': 'isAriaDisabled()',
    '[attr.disabled]': 'isNativeDisabled()',
    '[attr.data-active]': 'step.active() ? "true" : null',
    '(click)': 'onClick()',
    '(keydown.enter)': 'onActivationKey($event)',
    '(keydown.space)': 'onActivationKey($event)',
  },
})
export class KjStepLabel {
  /** Parent step context. */
  readonly step = inject(KJ_STEP);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** True when host element is a native `<button>`. */
  private readonly isButton = computed(
    () => this.host.nativeElement.tagName === 'BUTTON',
  );

  /** Resolves the `aria-disabled` attribute string ('true' or null). */
  readonly isAriaDisabled = computed(() => {
    const blocked = this.step.disabled() || !this.step.reachable();
    return blocked ? 'true' : null;
  });

  /** Resolves the native `disabled` attribute, only when host is a button. */
  readonly isNativeDisabled = computed(() => {
    if (!this.isButton()) return null;
    const blocked = this.step.disabled() || !this.step.reachable();
    return blocked ? '' : null;
  });

  /** @internal */
  onClick(): void {
    if (this.step.disabled() || !this.step.reachable()) return;
    this.step.activate();
  }

  /** @internal */
  onActivationKey(event: Event): void {
    // Native <button> handles Enter/Space natively — only intercept when host is not a button.
    if (this.isButton()) return;
    event.preventDefault();
    if (this.step.disabled() || !this.step.reachable()) return;
    this.step.activate();
  }
}

/**
 * Marks an element as the *content panel* of its parent {@link KjStep}.
 * Host-binds `role="region"`, `aria-labelledby` to the step's label id,
 * and toggles `[hidden]` / `[inert]` based on the step's active state.
 *
 * The wrapper layer renders the content via `@if (step.active())` so only
 * the active panel is in the DOM. This directive's host bindings remain
 * correct even when the wrapper opts to keep all panels mounted (e.g.
 * for a crossfade).
 *
 * @example
 * ```html
 * <section kjStepContent>...</section>
 * ```
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStepContent]',
  standalone: true,
  host: {
    role: 'region',
    '[attr.id]': 'step.contentId()',
    '[attr.aria-labelledby]': 'step.labelId()',
    '[attr.hidden]': '!step.active() ? "" : null',
    '[attr.inert]': '!step.active() ? "" : null',
    '[attr.data-state]': 'step.active() ? "active" : "inactive"',
    '[attr.tabindex]': 'step.active() ? "-1" : null',
  },
})
export class KjStepContent {
  /** Parent step context. */
  readonly step = inject(KJ_STEP);
}

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
  private readonly stepper = inject(KJ_STEPPER);

  /** @internal */
  readonly isDisabled = computed(() => (this.stepper.canAdvance() ? null : ''));

  /** @internal */
  onClick(): void {
    this.stepper.next();
  }
}

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
  private readonly stepper = inject(KJ_STEPPER);

  /** @internal */
  readonly isDisabled = computed(() => (this.stepper.canRetreat() ? null : ''));

  /** @internal */
  onClick(): void {
    this.stepper.previous();
  }
}

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
  private readonly stepper = inject(KJ_STEPPER);

  /** @internal */
  onClick(): void {
    this.stepper.reset();
  }
}
