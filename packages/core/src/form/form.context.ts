import { InjectionToken, Signal } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * A pair of (control name path, host element) registered with KjForm so the
 * focus-on-error pipeline can target the right DOM node without a query crawl.
 */
export interface KjFormControlRegistration {
  /** Dot-path of the control within the form group (e.g. `'address.street'`). */
  readonly path: string;
  /** Host element that should receive focus when this control is the first invalid one. */
  readonly element: HTMLElement;
  /** Optional human label (used by the error summary). */
  readonly label?: string;
}

/**
 * Public surface that `KjForm` exposes to descendants via the `KJ_FORM`
 * injection token. Only descendants that need form-level coordination
 * (submitting flag, control registry, summary updates) inject this token.
 */
export interface KjFormContext {
  /** The Angular FormGroup powering this form (resolved from `[formGroup]` or `NgForm`). */
  readonly form: Signal<FormGroup | null>;
  /** True while an async submit is in flight. */
  readonly submitting: Signal<boolean>;
  /** True after the user has attempted submit at least once. */
  readonly submitted: Signal<boolean>;
  /** True when the most recent submit attempt was invalid. */
  readonly invalid: Signal<boolean>;
  /** Snapshot of the invalid leaf controls from the most recent submit attempt. */
  readonly invalidControls: Signal<readonly InvalidControlInfo[]>;
  /**
   * Register a host element as the focus target for `path`.
   * Returns a cleanup callback that removes the registration.
   */
  registerControl(reg: KjFormControlRegistration): () => void;
  /** Imperative submit — equivalent to dispatching a `submit` event on the host. */
  submit(): void;
}

/** Invalid leaf control descriptor used by the error summary. */
export interface InvalidControlInfo {
  /** Dot-path of the control. */
  readonly path: string;
  /** The Angular AbstractControl reference. */
  readonly control: AbstractControl;
  /** Human label (falls back to the path). */
  readonly label: string;
}

/** Injection token for the parent `<form kjForm>` directive. */
export const KJ_FORM = new InjectionToken<KjFormContext>('KjForm');
