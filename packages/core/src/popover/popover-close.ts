import { Directive, inject } from '@angular/core';
import { KJ_POPOVER, type KjPopoverContext } from './popover.context';

/**
 * Convenience close button. Place inside a `[kjPopoverContent]` template.
 * Calls the parent context's `hide('close-button')` on click — the close
 * propagates the `'close-button'` reason through the cancellable
 * `kjCloseRequested` cycle so consumer logic can intervene.
 *
 * @example
 * ```html
 * <ng-template kjPopoverContent>
 *   …
 *   <button kjPopoverClose>Close</button>
 * </ng-template>
 * ```
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjPopoverClose]',
  standalone: true,
  host: {
    '(click)': 'onClick($event)',
  },
})
export class KjPopoverClose {
  private readonly ctx = inject<KjPopoverContext>(KJ_POPOVER);

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.ctx.hide('close-button');
  }
}
