import { InjectionToken, Signal } from '@angular/core';

/** Per-step context exposed to `KjStepLabel` and `KjStepContent`. */
export interface KjStepContext {
  /** 0-based index in the parent stepper's step set. */
  readonly index: Signal<number>;
  /** True when this step is the active one. */
  readonly active: Signal<boolean>;
  /** True when this step has been completed (consumer-set via `kjStepCompleted`). */
  readonly completed: Signal<boolean>;
  /** True when this step is in an error state (consumer-set via `kjStepError`). */
  readonly error: Signal<boolean>;
  /** True when this step is optional (does not gate linear advancement). */
  readonly optional: Signal<boolean>;
  /** True when this step is reachable in the current mode. */
  readonly reachable: Signal<boolean>;
  /** True when this step is explicitly disabled by the consumer. */
  readonly disabled: Signal<boolean>;
  /** Optional consumer-supplied semantic key, used by `goToKey()`. */
  readonly key: Signal<string | undefined>;
  /** Stable id for `aria-labelledby` wiring. */
  readonly labelId: Signal<string>;
  /** Stable id for the content region. */
  readonly contentId: Signal<string>;
  /** Activate this step (subject to linear-mode gating). */
  activate(): void;
}

/** Stepper-root context exposed to step / label / content / command directives. */
export interface KjStepperContext {
  /** Active step index (0-based). */
  readonly activeStep: Signal<number>;
  /** Total number of registered steps. */
  readonly totalSteps: Signal<number>;
  /** @internal — read-only view of registered steps in registration order. */
  readonly steps: Signal<readonly KjStepContext[]>;
  /** Linear-mode flag. */
  readonly linear: Signal<boolean>;
  /** Orientation. */
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  /** True when `next()` will succeed. */
  readonly canAdvance: Signal<boolean>;
  /** True when `previous()` will succeed. */
  readonly canRetreat: Signal<boolean>;
  /** Imperative navigation. */
  next(): void;
  previous(): void;
  goTo(index: number): void;
  goToKey(key: string): void;
  reset(): void;
  /** @internal — `KjStep` registers / unregisters here. */
  register(step: KjStepContext): void;
  /** @internal */
  unregister(step: KjStepContext): void;
  /** @internal — `KjStep` reports its reachability under linear gating. */
  isReachable(index: number): boolean;
}

/** Injection token for the root stepper directive. */
export const KJ_STEPPER = new InjectionToken<KjStepperContext>('KjStepper');

/** Injection token for an individual step directive. */
export const KJ_STEP = new InjectionToken<KjStepContext>('KjStep');
