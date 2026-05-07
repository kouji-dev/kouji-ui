import { Directive, inject } from '@angular/core';
import { KJ_FIELD } from './field.context';

/**
 * Label inside a `[kjField]`. Reflects the field's `controlId` as `for=`
 * and mirrors the field's required / disabled / invalid state via
 * `data-*` attributes (theme CSS draws the visual `*` for required).
 *
 * @example
 * ```html
 * <label kjFieldLabel>Email</label>
 * ```
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjFieldLabel]',
  standalone: true,
  host: {
    '[attr.id]': 'ctx.labelId()',
    '[attr.for]': 'ctx.controlId()',
    '[attr.data-required]': 'ctx.required() ? "" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[attr.data-invalid]': 'ctx.invalid() ? "" : null',
  },
})
export class KjFieldLabel {
  /** @internal */ readonly ctx = inject(KJ_FIELD);
}
