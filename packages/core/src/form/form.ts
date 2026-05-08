import {
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { AbstractControl, FormArray, FormGroup, FormGroupDirective, NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  InvalidControlInfo,
  KJ_FORM,
  KjFormContext,
  KjFormControlRegistration,
} from './form.context';

/**
 * Async submit handler signature accepted by `[kjAsyncSubmit]`. The directive
 * awaits the returned promise/observable and toggles `submitting` for its
 * lifetime.
 */
export type KjAsyncSubmitHandler<T = unknown> = (
  value: T,
) => void | Promise<unknown> | Observable<unknown>;

/**
 * Coordinator directive applied to a `<form>` element. Owns the submit
 * pipeline (intercept, validity check, focus-on-first-error, scroll-into-view,
 * async submitting state, mark-all-as-touched, optional error summary). Defers
 * to Angular Forms (`FormGroup` / `NgForm`) for validation; this directive is
 * a coordinator, not a state holder.
 *
 * - Emits `(kjSubmit)` only when the form is valid (replaces hand-rolled
 *   `(ngSubmit)` + `if (form.invalid) return` patterns).
 * - Emits `(kjInvalidSubmit)` when the user submitted but validity failed,
 *   useful for analytics.
 * - When `[kjAsyncSubmit]` is set, awaits its returned `Promise`/`Observable`
 *   and reflects `aria-busy="true"` / `data-submitting=""` for the lifetime.
 *
 * @example
 * ```html
 * <form kjForm [formGroup]="form" (kjSubmit)="onSubmit($event)">
 *   <input formControlName="email" kjInput />
 *   <button type="submit">Sign in</button>
 * </form>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name form
 * @doc-is-main
 */
@Directive({
  selector: 'form[kjForm]',
  standalone: true,
  exportAs: 'kjForm',
  providers: [{ provide: KJ_FORM, useExisting: KjForm }],
  host: {
    '[attr.aria-busy]': 'submitting() ? "true" : null',
    '[attr.aria-describedby]': 'errorSummaryId() ?? null',
    '[attr.data-submitting]': 'submitting() ? "" : null',
    '[attr.data-invalid]': 'invalid() ? "" : null',
    '(submit)': 'onNativeSubmit($event)',
  },
})
export class KjForm implements KjFormContext {
  private readonly el = inject<ElementRef<HTMLFormElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly ngForm = inject(NgForm, { optional: true, self: true });
  private readonly formGroupDir = inject(FormGroupDirective, { optional: true, self: true });

  // ── Inputs ───────────────────────────────────────────────────────────
  /** When `false`, skips moving focus to the first invalid control on invalid submit. */
  readonly kjFocusOnError = input(true, { transform: booleanAttribute });
  /** When `false`, does not call `scrollIntoView` on the focused control. */
  readonly kjScrollOnError = input(true, { transform: booleanAttribute });
  /** Forwarded to `scrollIntoView({ behavior })`. Auto-downgrades to `'auto'` under `prefers-reduced-motion`. */
  readonly kjScrollBehavior = input<ScrollBehavior>('smooth');
  /** Forwarded to `scrollIntoView({ block })`. */
  readonly kjScrollBlock = input<ScrollLogicalPosition>('center');
  /** When `true` (default), calls `markAllAsTouched()` before validity check so all errors show together. */
  readonly kjMarkAllAsTouchedOnSubmit = input(true, { transform: booleanAttribute });
  /** When `true`, calls `form.reset()` after a successful async submit resolves. */
  readonly kjResetOnSuccess = input(false, { transform: booleanAttribute });
  /** Optional async submit handler. When set, the directive awaits its result and toggles `submitting`. */
  readonly kjAsyncSubmit = input<KjAsyncSubmitHandler | undefined>(undefined);

  // ── Outputs ──────────────────────────────────────────────────────────
  /** Emits the form value when the user submits and the form is valid. */
  readonly kjSubmit = output<unknown>();
  /** Emits the FormGroup when the user submits but validity fails. */
  readonly kjInvalidSubmit = output<FormGroup>();

  // ── Models / state ───────────────────────────────────────────────────
  /** Two-way bindable submitting flag. When unbound, the directive owns it internally. */
  readonly kjSubmitting = model(false);

  private readonly _submitted = signal(false);
  private readonly _invalid = signal(false);
  private readonly _invalidControls = signal<readonly InvalidControlInfo[]>([]);
  private readonly _errorSummaryId = signal<string | null>(null);
  private readonly registry = new Map<string, KjFormControlRegistration>();
  private prefersReducedMotion = false;

  // ── Public surface (KjFormContext) ───────────────────────────────────
  readonly form = computed<FormGroup | null>(() => {
    if (this.formGroupDir) return this.formGroupDir.form;
    if (this.ngForm) return this.ngForm.form;
    return null;
  });
  readonly submitting = computed(() => this.kjSubmitting());
  readonly submitted = this._submitted.asReadonly();
  readonly invalid = this._invalid.asReadonly();
  readonly invalidControls = this._invalidControls.asReadonly();
  readonly errorSummaryId = this._errorSummaryId.asReadonly();

  constructor() {
    afterNextRender(() => {
      try {
        this.prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        this.prefersReducedMotion = false;
      }
    });
  }

  registerControl(reg: KjFormControlRegistration): () => void {
    this.registry.set(reg.path, reg);
    return () => {
      const cur = this.registry.get(reg.path);
      if (cur === reg) this.registry.delete(reg.path);
    };
  }

  /** Internal: called by `KjFormErrorSummary` to advertise its `id` to the form. */
  setErrorSummaryId(id: string | null): void {
    this._errorSummaryId.set(id);
  }

  /** Imperative submit — equivalent to dispatching a `submit` event on the host. */
  submit(): void {
    this.el.nativeElement.requestSubmit();
  }

  /** @internal — host listener target. */
  onNativeSubmit(event: Event): void {
    event.preventDefault();
    // Drop submit attempts while a previous submission is still in flight.
    if (this.submitting()) return;

    const form = this.form();
    this._submitted.set(true);

    if (!form) {
      // No Angular forms binding — log a dev-mode warning and bail out.
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn(
          '[KjForm] <form kjForm> has no `[formGroup]` or `ngForm` binding. The directive is a coordinator over Angular Forms and needs one to function.',
        );
      }
      return;
    }

    if (this.kjMarkAllAsTouchedOnSubmit()) {
      form.markAllAsTouched();
    }

    if (form.invalid) {
      this._invalid.set(true);
      const invalidControls = collectInvalidControls(form);
      this._invalidControls.set(this.attachLabels(invalidControls));
      this.kjInvalidSubmit.emit(form);
      this.handleInvalidSubmit(invalidControls);
      return;
    }

    this._invalid.set(false);
    this._invalidControls.set([]);

    const handler = this.kjAsyncSubmit();
    if (handler) {
      this.runAsyncSubmit(handler, form);
    } else {
      this.kjSubmit.emit(form.value);
    }
  }

  // ── Internals ────────────────────────────────────────────────────────

  private attachLabels(invalid: ReadonlyArray<{ path: string; control: AbstractControl }>): InvalidControlInfo[] {
    return invalid.map((entry) => {
      const reg = this.registry.get(entry.path);
      return { ...entry, label: reg?.label ?? humanizePath(entry.path) };
    });
  }

  private handleInvalidSubmit(invalid: ReadonlyArray<{ path: string }>): void {
    if (!this.kjFocusOnError() || invalid.length === 0) return;
    const first = invalid[0];
    const reg = this.registry.get(first.path);
    const target = reg?.element ?? this.fallbackQuery(first.path);
    if (!target) return;
    try {
      target.focus({ preventScroll: !this.kjScrollOnError() });
    } catch {
      // Some hosts (SSR/jsdom) may not implement focus options — ignore.
      target.focus?.();
    }
    if (this.kjScrollOnError()) {
      const behavior = this.prefersReducedMotion ? 'auto' : this.kjScrollBehavior();
      target.scrollIntoView?.({ block: this.kjScrollBlock(), behavior });
    }
  }

  private fallbackQuery(path: string): HTMLElement | null {
    const root = this.el.nativeElement;
    const escaped = cssEscape(path);
    return (
      root.querySelector<HTMLElement>(`[formcontrolname="${escaped}"]`) ??
      root.querySelector<HTMLElement>(`[ng-reflect-name="${escaped}"]`) ??
      null
    );
  }

  private runAsyncSubmit(handler: KjAsyncSubmitHandler, form: FormGroup): void {
    let result: ReturnType<KjAsyncSubmitHandler>;
    this.kjSubmitting.set(true);
    try {
      result = handler(form.value);
    } catch (err) {
      this.kjSubmitting.set(false);
      throw err;
    }
    if (result instanceof Promise) {
      result.then(
        () => this.afterAsync(form, true),
        () => this.afterAsync(form, false),
      );
      // Also emit the synchronous (kjSubmit) for consumers that use both shapes.
      this.kjSubmit.emit(form.value);
      return;
    }
    if (isObservable(result)) {
      const sub = result.subscribe({
        complete: () => this.afterAsync(form, true),
        error: () => this.afterAsync(form, false),
      });
      // Defensive: if the observable completes synchronously, the subscribe
      // call already cleaned us up. Otherwise this no-op preserves cleanup
      // behaviour (we don't track for unsubscription beyond completion).
      void sub;
      this.kjSubmit.emit(form.value);
      return;
    }
    // Sync handler — release the flag immediately and emit.
    this.kjSubmitting.set(false);
    this.kjSubmit.emit(form.value);
  }

  private afterAsync(form: FormGroup, success: boolean): void {
    this.kjSubmitting.set(false);
    if (success && this.kjResetOnSuccess()) {
      form.reset();
      this._submitted.set(false);
      this._invalid.set(false);
      this._invalidControls.set([]);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Walks a `FormGroup` / `FormArray` tree depth-first, returning invalid leaves. */
function collectInvalidControls(
  root: AbstractControl,
): ReadonlyArray<{ path: string; control: AbstractControl }> {
  const out: { path: string; control: AbstractControl }[] = [];
  const walk = (ctrl: AbstractControl, path: string): void => {
    if (ctrl instanceof FormGroup) {
      for (const [name, child] of Object.entries(ctrl.controls)) {
        walk(child, path ? `${path}.${name}` : name);
      }
      return;
    }
    if (ctrl instanceof FormArray) {
      ctrl.controls.forEach((child, i) => walk(child, `${path}.${i}`));
      return;
    }
    if (ctrl.invalid) {
      out.push({ path, control: ctrl });
    }
  };
  walk(root, '');
  return out;
}

/** Converts `'address.street'` → `'Address street'` for fallback labels. */
function humanizePath(path: string): string {
  if (!path) return '';
  const last = path.split('.').pop() ?? path;
  const words = last.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Type guard for RxJS observable. Avoids a hard dep on `isObservable` in tests. */
function isObservable(value: unknown): value is Observable<unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  );
}

/** Minimal CSS.escape polyfill for `formcontrolname` attribute selectors. */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}
