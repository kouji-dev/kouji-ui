import { Subject, type Observable } from 'rxjs';
import type { Signal } from '@angular/core';
import type { KjOverlayController } from '../primitives/overlay/controller';

/**
 * Reference returned by `KjDrawer.open()`. Mirrors {@link import('../dialog/dialog.ref').KjDialogRef}.
 *
 * Use `close(result?)` to dismiss the drawer programmatically. Subscribe to
 * `afterClosed$` for the close result, or await the `result` promise.
 *
 * @category Core/Overlay
 */
export class KjDrawerRef<T, R = unknown> {
  private _instance: T | null = null;
  private _result: R | undefined;
  private resolveResult!: (r: R | undefined) => void;
  /** Promise resolving with the close result. */
  readonly result: Promise<R | undefined>;

  private readonly _afterOpened = new Subject<void>();
  private readonly _afterClosed = new Subject<R | undefined>();
  /** Emits once after the drawer has finished opening. */
  readonly afterOpened$: Observable<void> = this._afterOpened.asObservable();
  /** Emits the close result once the drawer has finished closing. */
  readonly afterClosed$: Observable<R | undefined> = this._afterClosed.asObservable();

  /** Reactive lifecycle state mirrored from the underlying controller. */
  readonly state: Signal<'closed' | 'opening' | 'open' | 'closing'>;
  /** Convenience for `state() === 'open' || 'opening'`. */
  readonly isOpen: Signal<boolean>;

  constructor(public readonly controller: KjOverlayController) {
    this.state = controller.state;
    this.isOpen = controller.isOpen;
    this.result = new Promise<R | undefined>((res) => {
      this.resolveResult = res;
    });
  }

  /** @internal Bind the rendered component instance for `instance`. */
  bindInstance(instance: T): void {
    this._instance = instance;
  }

  /** The rendered drawer component instance. */
  get instance(): T {
    if (!this._instance) {
      throw new Error('KjDrawerRef: instance not bound');
    }
    return this._instance;
  }

  /** Close the drawer with an optional result payload. */
  close(result?: R): void {
    this._result = result;
    this.controller.close('programmatic');
    queueMicrotask(() => {
      this._afterClosed.next(this._result);
      this._afterClosed.complete();
      this.resolveResult(this._result);
    });
  }
}
