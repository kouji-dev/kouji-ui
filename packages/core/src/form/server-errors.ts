import { FormGroup } from '@angular/forms';

/**
 * Field-level error messages returned by a backend, keyed by control path
 * (`'email'`, `'address.street'`, …). Values may be a single message or a
 * list; {@link kjApplyServerErrors} normalizes both to `readonly string[]`.
 */
export type KjServerErrors = Record<string, string | readonly string[]>;

/** Options for {@link kjApplyServerErrors}. */
export interface KjApplyServerErrorsOptions {
  /**
   * Error key set on each control (`control.errors[errorKey]`), holding the
   * normalized `readonly string[]` of messages. Default `'server'`.
   */
  errorKey?: string;
  /** Mark each targeted control as touched so its error shows. Default `true`. */
  markTouched?: boolean;
}

/**
 * Applies backend validation errors onto a `FormGroup`'s controls: each entry
 * whose key matches a control path gets `{ [errorKey]: string[] }` merged into
 * that control's errors (and is marked touched by default) so field-level UI —
 * `kj-field [kjInvalid]` + `kj-field-error` — lights up per field.
 *
 * The error clears itself the next time the control's validators run (any
 * user edit), which is the behaviour you want for server-side messages.
 *
 * Returns the paths that did not match any control, so callers can surface
 * those messages globally (toast, form-level error line) instead of losing
 * them.
 *
 * @example
 * ```ts
 * const unmatched = kjApplyServerErrors(this.form, err.fields);
 * if (unmatched.length) this.globalError.set('…');
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name form
 */
export function kjApplyServerErrors(
  form: FormGroup,
  errors: KjServerErrors,
  options: KjApplyServerErrorsOptions = {},
): string[] {
  const errorKey = options.errorKey ?? 'server';
  const markTouched = options.markTouched ?? true;
  const unmatched: string[] = [];

  for (const [path, value] of Object.entries(errors)) {
    const control = form.get(path);
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (m): m is string => typeof m === 'string' && m.length > 0,
    );
    if (!control || messages.length === 0) {
      unmatched.push(path);
      continue;
    }
    control.setErrors({ ...control.errors, [errorKey]: messages });
    if (markTouched) control.markAsTouched();
  }
  return unmatched;
}

/**
 * Reads the messages previously set by {@link kjApplyServerErrors} from a
 * control's errors, or `null` when none are present. Convenience for
 * templates rendering the first (or all) server message(s) of a field.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name form
 */
export function kjServerErrorsOf(
  control: { errors: Record<string, unknown> | null } | null | undefined,
  errorKey = 'server',
): readonly string[] | null {
  const value = control?.errors?.[errorKey];
  return Array.isArray(value) && value.length > 0 ? (value as readonly string[]) : null;
}
