import { Directive, inject } from '@angular/core';
import { KjOverlayController } from '../primitives/overlay/controller';

/**
 * Convenience close button. Place inside a `[kjPopoverContent]` panel.
 * Calls the overlay controller's `close('programmatic')` on click.
 *
 * @example
 * ```html
 * <kj-popover-content [kjFor]="t">
 *   …
 *   <button kjPopoverClose>Close</button>
 * </kj-popover-content>
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
  private readonly controller = inject(KjOverlayController);

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.controller.close('programmatic');
  }
}
