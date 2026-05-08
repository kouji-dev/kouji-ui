import { DestroyRef, Directive, inject, input } from '@angular/core';
import { KJ_FIELD } from './field.context';

let kjFieldErrorIdCounter = 0;

/**
 * Error text inside a `[kjField]`. The host id is auto-minted on
 * construction and registered with the field so it participates in the
 * inner control's `aria-describedby` chain (only while visible).
 *
 * Carries `role="alert"` + `aria-live="polite"` so newly-shown errors
 * are announced. Hidden via `[hidden]` when the field is not in error
 * state.
 *
 * @example
 * ```html
 * <span kjFieldError>Please enter a valid email.</span>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name field
 */
@Directive({
  selector: '[kjFieldError]',
  standalone: true,
  host: {
    role: 'alert',
    'aria-live': 'polite',
    '[attr.id]': 'id()',
    '[attr.hidden]': '!ctx.invalid() ? "" : null',
  },
})
export class KjFieldError {
  /** @internal */ readonly ctx = inject(KJ_FIELD);

  /** Override the auto-minted host id. */
  readonly kjFieldErrorId = input<string | undefined>(undefined);

  /** @internal */ readonly id = (() => {
    const seq = ++kjFieldErrorIdCounter;
    return () => this.kjFieldErrorId() ?? `kj-field-error-${seq}`;
  })();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const deregister = this.ctx.registerDescribedBy(this.id(), 'error');
    destroyRef.onDestroy(deregister);
  }
}
