import { KjOverlayRef } from '../primitives/overlay/overlay-ref';
import type { KjOverlayController } from '../primitives/overlay/controller';

/**
 * Reference returned by `KjDialogService.open()`. Closes the dialog, exposes the
 * rendered instance, and reports the open / close lifecycle.
 *
 * Extends {@link KjOverlayRef}, the shared base the three service-launched
 * overlay handles have in common - `close(result?)`, `instance`, the settled
 * `afterClosed$` / `result` pair and the controller's lifecycle signals. This
 * subclass adds nothing but its own name.
 *
 * @doc-category Core/Overlay
 */
export class KjDialogRef<T, R = unknown> extends KjOverlayRef<T, R> {
  constructor(controller: KjOverlayController) {
    super(controller, 'KjDialogRef');
  }
}
