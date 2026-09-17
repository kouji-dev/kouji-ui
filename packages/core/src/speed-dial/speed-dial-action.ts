import { Directive, booleanAttribute, input } from '@angular/core';
import { KJ_SPEED_DIAL } from './speed-dial.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * One action button in a Speed Dial cluster.
 *
 * Apply alongside `kjButton` on a native `<button>` to inherit the button
 * presets. This directive contributes `role="menuitem"` and closes the parent
 * dial after the consumer's click handler runs (controllable via
 * `kjCloseOnActivate`).
 *
 * @example
 * ```html
 * <button kjButton kjSpeedDialAction aria-label="Edit" (click)="edit()">E</button>
 * ```
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name speed-dial
 */
@Directive({
  selector: '[kjSpeedDialAction]',
  standalone: true,
  exportAs: 'kjSpeedDialAction',
  host: {
    role: 'menuitem',
    '(click)': 'onClick()',
  },
})
export class KjSpeedDialAction {
  private readonly ctx = injectParent(KJ_SPEED_DIAL, { child: 'KjSpeedDialAction', parent: '[kjSpeedDial]' });

  /** Whether activating this action should close the dial. Default `true`. */
  readonly kjCloseOnActivate = input(true, { transform: booleanAttribute });

  protected onClick(): void {
    if (!this.kjCloseOnActivate()) return;
    // `'select'` rather than a bare programmatic close: a consumer reading
    // `KjOverlayController.closeReason` can tell an activation from a dismissal.
    this.ctx.close('select');
  }
}
