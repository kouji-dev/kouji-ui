import { KjOverlayRef } from '../primitives/overlay/overlay-ref';
import type { KjOverlayController } from '../primitives/overlay/controller';

/**
 * Reference returned by `KjDrawer.open()`.
 *
 * Use `close(result?)` to dismiss the drawer programmatically. Subscribe to
 * `afterClosed$` for the close result, or await the `result` promise.
 *
 * Extends {@link KjOverlayRef}, the shared base the three service-launched
 * overlay handles have in common - `close(result?)`, `instance`, the settled
 * `afterClosed$` / `result` pair and the controller's lifecycle signals. This
 * subclass adds nothing but its own name.
 *
 * @doc-category Core/Overlay
 */
export class KjDrawerRef<T, R = unknown> extends KjOverlayRef<T, R> {
  constructor(controller: KjOverlayController) {
    super(controller, 'KjDrawerRef');
  }
}
