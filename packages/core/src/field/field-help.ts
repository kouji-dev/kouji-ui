import { DestroyRef, Directive, inject, input } from '@angular/core';
import { KJ_FIELD } from './field.context';
import { KjId } from '../primitives/overlay/id';
import { injectParent } from '../primitives/diagnostics/inject-parent';

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
 * @doc-category Core/Inputs
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
  /** @internal */ readonly ctx = injectParent(KJ_FIELD, { child: 'KjFieldHelp', parent: '[kjField]' });

  /** Override the auto-minted host id. */
  readonly kjFieldHelpId = input<string | undefined>(undefined);

  /** @internal */ readonly id = (() => {
    const generated = inject(KjId).mint('field-help');
    return () => this.kjFieldHelpId() ?? generated;
  })();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const deregister = this.ctx.registerDescribedBy(this.id(), 'help');
    destroyRef.onDestroy(deregister);
  }
}
