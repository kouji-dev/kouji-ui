import type { Signal } from '@angular/core';
import { Subject, type Observable } from 'rxjs';
import type { KjOverlayController } from './controller';
import type { KjCloseReason, KjOverlayState } from './types';

/**
 * Shared base for the handles the overlay services hand back —
 * `KjDialogRef`, `KjDrawerRef` and `KjSheetRef`.
 *
 * Every service-launched overlay needs the same four things: a way to close
 * with a result, the rendered component instance, a settled `afterClosed$` /
 * `result` pair that fires exactly once (whether the overlay was closed
 * programmatically or dismissed by Escape / the scrim), and the controller's
 * lifecycle state mirrored as signals. Those were copy-pasted across the three
 * refs; they live here now, and each ref only names itself.
 *
 * Subclasses pass their public class name to the constructor. It is used in
 * the one place the three files genuinely differed — the error thrown when
 * {@link instance} is read before the body component exists.
 *
 * @typeParam T - The rendered body component type.
 * @typeParam R - The close-result type.
 *
 * @doc-category Core/Overlay
 */
export abstract class KjOverlayRef<T, R = unknown> {
  private _instance: T | null = null;
  private _result: R | undefined;
  private resolveResult!: (r: R | undefined) => void;

  private readonly _afterOpened = new Subject<void>();
  private readonly _afterClosed = new Subject<R | undefined>();

  /** Promise resolving with the close result. */
  readonly result: Promise<R | undefined>;

  /** Emits once the open transition has completed and initial focus is placed, then completes. */
  readonly afterOpened$: Observable<void> = this._afterOpened.asObservable();

  /**
   * Emits the close result once the overlay closes — after {@link close} or a
   * dismissal by Escape / the scrim (`result` is `undefined` then; see
   * {@link closeReason}) — then completes.
   */
  readonly afterClosed$: Observable<R | undefined> = this._afterClosed.asObservable();

  /** Reactive lifecycle state mirrored from the underlying controller. */
  readonly state: Signal<KjOverlayState>;

  /** Convenience for `state() === 'open' || 'opening'`. */
  readonly isOpen: Signal<boolean>;

  /**
   * Why the overlay closed (or is closing): `'programmatic'` after
   * {@link close}, `'escape'` / `'backdrop'` for a dismissal, `null` while it
   * has not closed. Mirrors `KjOverlayController.closeReason`.
   */
  readonly closeReason: Signal<KjCloseReason | null>;

  protected constructor(
    /** The controller driving the overlay this ref points at. */
    readonly controller: KjOverlayController,
    /** Public class name of the concrete ref, used in the `instance` error. */
    private readonly refName: string,
  ) {
    this.state = controller.state;
    this.isOpen = controller.isOpen;
    this.closeReason = controller.closeReason;
    this.result = new Promise<R | undefined>((res) => {
      this.resolveResult = res;
    });
  }

  /** @internal Bind the rendered component instance for {@link instance}. */
  bindInstance(instance: T): void {
    this._instance = instance;
  }

  /** The rendered body component instance. */
  get instance(): T {
    if (!this._instance) {
      throw new Error(`${this.refName}: instance not bound`);
    }
    return this._instance;
  }

  /** @internal Called by the service when the controller reaches `'open'`. Emits `afterOpened$` once. */
  _notifyOpened(): void {
    if (this._afterOpened.closed) return;
    this._afterOpened.next();
    this._afterOpened.complete();
  }

  /**
   * @internal Called by the service once the controller reaches `'closed'`
   * after having been open — a dismissal by Escape or the scrim settles
   * `afterClosed$` / `result` exactly like {@link close} does. Idempotent.
   */
  _notifyClosed(): void {
    if (this._afterClosed.closed) return;
    // An overlay closed before it finished opening never emits afterOpened$;
    // complete it so subscribers do not wait forever.
    if (!this._afterOpened.closed) this._afterOpened.complete();
    this._afterClosed.next(this._result);
    this._afterClosed.complete();
    this.resolveResult(this._result);
  }

  /** Close the overlay with an optional result payload. */
  close(result?: R): void {
    this._result = result;
    this.controller.close('programmatic');
    // afterClosed$ subscribers see the result before teardown.
    queueMicrotask(() => this._notifyClosed());
  }
}
