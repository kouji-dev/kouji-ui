import { DestroyRef, Directive, inject } from '@angular/core';
import { KJ_FIELD } from './field.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Label inside a `[kjField]`. Reflects the field's `controlId` as `for=`
 * and mirrors the field's required / disabled / invalid state via
 * `data-*` attributes (theme CSS draws the visual `*` for required).
 *
 * @example
 * ```html
 * <label kjFieldLabel>Email</label>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name field
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
  /** @internal */ readonly ctx = injectParent(KJ_FIELD, { child: 'KjFieldLabel', parent: '[kjField]' });

  constructor() {
    // Tells the field that `labelId` now names a live element. A control that
    // can only be labelled by reference (`<div kjInputOtp role="group">`)
    // waits for this before pointing `aria-labelledby` at it.
    inject(DestroyRef).onDestroy(this.ctx.registerLabel());
  }
}
