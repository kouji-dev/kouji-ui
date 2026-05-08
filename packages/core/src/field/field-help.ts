import { DestroyRef, Directive, inject, input } from '@angular/core';
import { KJ_FIELD } from './field.context';

let kjFieldHelpIdCounter = 0;

/**
 * Helper / description text inside a `[kjField]`. The host id is
 * auto-minted on construction and registered with the field so it
 * participates in the inner control's `aria-describedby` chain.
 *
 * Hidden when the field is in error state — the error message takes
 * precedence to avoid double-announcement.
 *
 * @example
 * ```html
 * <span kjFieldHelp>Format: name@example.com</span>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name field
 */
@Directive({
  selector: '[kjFieldHelp]',
  standalone: true,
  host: {
    '[attr.id]': 'id()',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[attr.hidden]': 'ctx.invalid() ? "" : null',
  },
})
export class KjFieldHelp {
  /** @internal */ readonly ctx = inject(KJ_FIELD);

  /** Override the auto-minted host id. */
  readonly kjFieldHelpId = input<string | undefined>(undefined);

  /** @internal */ readonly id = (() => {
    const seq = ++kjFieldHelpIdCounter;
    return () => this.kjFieldHelpId() ?? `kj-field-help-${seq}`;
  })();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const deregister = this.ctx.registerDescribedBy(this.id(), 'help');
    destroyRef.onDestroy(deregister);
  }
}
