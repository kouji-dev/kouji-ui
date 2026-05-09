import { Directive, inject } from '@angular/core';
import { KJ_SPEED_DIAL, type KjSpeedDialContext } from './speed-dial.context';

/**
 * The floating action button that toggles the Speed Dial open/closed.
 *
 * Apply alongside `kjButton` on a native `<button>` so the trigger inherits
 * the button presets (variant, size, focus ring, capture-phase disabled
 * suppression). The trigger itself contributes the menu-button ARIA wiring
 * (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`) and the click
 * toggle semantics that drive the parent `[kjSpeedDial]`.
 *
 * @example
 * ```html
 * <div kjSpeedDial>
 *   <button kjButton kjSpeedDialTrigger aria-label="Open actions">+</button>
 *   …
 * </div>
 * ```
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name speed-dial
 */
@Directive({
  selector: '[kjSpeedDialTrigger]',
  standalone: true,
  exportAs: 'kjSpeedDialTrigger',
  host: {
    type: 'button',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'ctx.expanded() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.contentId',
    '[attr.data-state]': 'ctx.expanded() ? "open" : "closed"',
    '(click)': 'onClick($event)',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class KjSpeedDialTrigger {
  /** @internal */
  readonly ctx = inject<KjSpeedDialContext>(KJ_SPEED_DIAL);

  protected onClick(event: MouseEvent): void {
    if (this.ctx.disabled()) return;
    event.stopPropagation();
    this.ctx.toggle();
  }

  protected onEscape(event: Event): void {
    if (!this.ctx.expanded()) return;
    event.preventDefault();
    event.stopPropagation();
    this.ctx.close();
  }
}
