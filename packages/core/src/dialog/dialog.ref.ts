import { Signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { KjOverlayController } from '../primitives/overlay/controller';

export class KjDialogRef<T, R = unknown> {
  private _instance: T | null = null;
  private _result: R | undefined;
  private resolveResult!: (r: R | undefined) => void;
  readonly result: Promise<R | undefined>;
  private readonly _afterOpened = new Subject<void>();
  private readonly _afterClosed = new Subject<R | undefined>();
  readonly afterOpened$: Observable<void> = this._afterOpened.asObservable();
  readonly afterClosed$: Observable<R | undefined> = this._afterClosed.asObservable();

  readonly state: Signal<'closed' | 'opening' | 'open' | 'closing'>;
  readonly isOpen: Signal<boolean>;

  constructor(
    public readonly controller: KjOverlayController,
  ) {
    this.state = controller.state;
    this.isOpen = controller.isOpen;
    this.result = new Promise<R | undefined>((res) => { this.resolveResult = res; });
  }

  /** @internal */
  bindInstance(instance: T) { this._instance = instance; }
  get instance(): T {
    if (!this._instance) throw new Error('KjDialogRef: instance not bound');
    return this._instance;
  }

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
