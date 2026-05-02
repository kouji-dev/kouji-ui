import { Directive, computed, inject, input } from '@angular/core';
import { KJ_FORM_FIELD, KjFormFieldContext } from './form.context';

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
 * @category Core/Inputs/Form
 */
@Directive({
  selector: '[kjFormField]', standalone: true,
  providers: [{ provide: KJ_FORM_FIELD, useExisting: KjFormField }],
  host: { '[attr.data-invalid]': 'kjFieldInvalid() ? "" : null' },
})
export class KjFormField implements KjFormFieldContext {
  /** Whether the field is in an invalid state. */
  kjFieldInvalid = input<boolean>(false);
  readonly invalid = computed(() => this.kjFieldInvalid());
}

/**
 * Label element within a form field.
 * @category Core/Inputs/Form
 */
@Directive({
  selector: '[kjFormLabel]', standalone: true,
  host: { '[attr.data-invalid]': 'ctx.invalid() ? "" : null' },
})
export class KjFormLabel { readonly ctx = inject(KJ_FORM_FIELD); }

/**
 * Error message element. Visible only when field is invalid.
 * @example `<span kjFormError>Email is invalid</span>`
 * @category Core/Inputs/Form
 */
@Directive({
  selector: '[kjFormError]', standalone: true,
  host: { role: 'alert', 'aria-live': 'polite', '[attr.hidden]': '!ctx.invalid() ? "" : null' },
})
export class KjFormError { readonly ctx = inject(KJ_FORM_FIELD); }
