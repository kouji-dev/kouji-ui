import { Directive, booleanAttribute, inject, input } from '@angular/core';
import { KJ_SPEED_DIAL, type KjSpeedDialContext } from './speed-dial.context';

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
 * @category Core/Actions
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
  private readonly ctx = inject<KjSpeedDialContext>(KJ_SPEED_DIAL);

  /** Whether activating this action should close the dial. Default `true`. */
  readonly kjCloseOnActivate = input(true, { transform: booleanAttribute });

  protected onClick(): void {
    if (!this.kjCloseOnActivate()) return;
    this.ctx.close();
  }
}
