import { Directive, inject } from '@angular/core';
import { KJ_FIELD } from './field.context';

/**
 * Compound input layout inside a `[kjField]`. Wraps an input together
 * with leading / trailing prefix or suffix addons (icons, units,
 * action buttons) and presents them as a single visual control.
 *
 * The directive itself is a presentational marker — it adds no ARIA
 * semantics beyond mirroring the field's invalid / disabled state via
 * `data-*` so theme CSS can paint the addons consistently with the
 * rest of the field.
 *
 * @example
 * ```html
 * <div kjField>
 *   <label kjFieldLabel>Amount</label>
 *   <div kjFieldGroup>
 *     <span class="kj-field-group__prefix">$</span>
 *     <input kjInput type="number" />
 *     <span class="kj-field-group__suffix">USD</span>
 *   </div>
 * </div>
 * ```
 * @category Core/Inputs
 */
@Directive({
  selector: '[kjFieldGroup]',
  standalone: true,
  host: {
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[attr.data-invalid]': 'ctx.invalid() ? "" : null',
  },
})
export class KjFieldGroup {
  /** @internal */ readonly ctx = inject(KJ_FIELD);
}
