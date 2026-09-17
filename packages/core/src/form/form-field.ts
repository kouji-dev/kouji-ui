import { Directive, booleanAttribute, computed, input } from '@angular/core';
import { KJ_FORM_FIELD, KjFormFieldContext } from './form-field.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Container for a form field. Groups label, input, and error message.
 * @example
 * ```html
 * <div kjFormField [kjFieldInvalid]="ctrl.invalid && ctrl.touched">
 *   <label kjFormLabel for="name">Name</label>
 *   <input id="name" kjInput />
 *   <span kjFormError>Name is required</span>
 * </div>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name form
 */
@Directive({
  selector: '[kjFormField]', standalone: true,
  providers: [{ provide: KJ_FORM_FIELD, useExisting: KjFormField }],
  host: { '[attr.data-invalid]': 'kjFieldInvalid() ? "" : null' },
})
export class KjFormField implements KjFormFieldContext {
  /** Whether the field is in an invalid state. */
  kjFieldInvalid = input(false, { transform: booleanAttribute });
  readonly invalid = computed(() => this.kjFieldInvalid());
}

/**
 * Label element within a form field.
 * @doc-category Core/Inputs
 * @doc
 * @doc-name form
 */
@Directive({
  selector: '[kjFormLabel]', standalone: true,
  host: { '[attr.data-invalid]': 'ctx.invalid() ? "" : null' },
})
export class KjFormLabel { readonly ctx = injectParent(KJ_FORM_FIELD, { child: 'KjFormLabel', parent: '[kjFormField]' }); }

/**
 * Error message element. Visible only when field is invalid.
 * @example `<span kjFormError>Email is invalid</span>`
 * @doc-category Core/Inputs
 * @doc
 * @doc-name form
 */
@Directive({
  selector: '[kjFormError]', standalone: true,
  host: { role: 'alert', 'aria-live': 'polite', '[attr.hidden]': '!ctx.invalid() ? "" : null' },
})
export class KjFormError { readonly ctx = injectParent(KJ_FORM_FIELD, { child: 'KjFormError', parent: '[kjFormField]' }); }
