import { KjOverlayRef } from '../primitives/overlay/overlay-ref';
import type { KjOverlayController } from '../primitives/overlay/controller';

/**
 * Reference returned by `KjSheetService.open()`.
 *
 * Use `close(result?)` to dismiss the bottom sheet programmatically. Subscribe
 * to `afterClosed$` for the close result, or await the `result` promise.
 *
 * Extends {@link KjOverlayRef}, the shared base the three service-launched
 * overlay handles have in common - `close(result?)`, `instance`, the settled
 * `afterClosed$` / `result` pair and the controller's lifecycle signals. This
 * subclass adds nothing but its own name.
 *
 * @doc-category Core/Overlay
 */
export class KjSheetRef<T, R = unknown> extends KjOverlayRef<T, R> {
  constructor(controller: KjOverlayController) {
    super(controller, 'KjSheetRef');
  }
}
