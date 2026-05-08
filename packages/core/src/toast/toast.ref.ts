import type { KjOverlayController } from '../primitives/overlay/controller';

/**
 * Reference returned from `KjToastService.show()` (and the variant sugar
 * methods). Owns the toast's overlay controller and its id, and exposes a
 * single `close()` method.
 *
 * Toast queue management (auto-dismiss timers, max-visible cap, pause/resume)
 * is owned by `KjToastService`; the ref is the per-toast handle returned to
 * callers.
 */
export class KjToastRef {
  constructor(
    /** Stable id for this toast — also used by the service's queue. */
    public readonly id: string,
    /** The overlay controller backing this toast's panel. */
    public readonly controller: KjOverlayController,
    private readonly _dismiss: (id: string) => void,
  ) {}

  /** Dismiss this toast. Idempotent. */
  close(): void {
    this._dismiss(this.id);
    this.controller.close('programmatic');
  }
}
