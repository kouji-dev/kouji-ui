import { Injectable, TemplateRef, Type, inject } from '@angular/core';
import { Dialog, DialogConfig, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

export { DIALOG_DATA };

/** Configuration for programmatically opened dialogs. */
export interface KjDialogOpenConfig<D = unknown> {
  /** Data to inject into the dialog component via `DIALOG_DATA`. */
  data?: D;
  /** Additional CSS classes for the dialog panel element. */
  panelClass?: string | string[];
  /**
   * Where to focus when the dialog opens.
   * Defaults to the first focusable element inside the dialog.
   */
  autoFocus?: boolean | string;
  /** Where to restore focus after the dialog closes. Defaults to the triggering element. */
  restoreFocus?: boolean | string;
  /** Panel width. */
  width?: string;
  /** Maximum panel width. */
  maxWidth?: string;
  /** Panel height. */
  height?: string;
  /** When `true`, clicking the backdrop or pressing Escape won't close the dialog. */
  disableClose?: boolean;
}

/**
 * Programmatic service for opening dialogs with components or templates.
 * The opened component can inject `DIALOG_DATA` for typed data and `DialogRef` to close itself.
 *
 * @example
 * ```ts
 * // Open a component as a dialog
 * private readonly dialog = inject(KjDialogService);
 *
 * openConfirm() {
 *   const ref = this.dialog.open(ConfirmDialogComponent, {
 *     data: { message: 'Delete this item?' },
 *   });
 *   ref.closed.subscribe(result => {
 *     if (result) this.doDelete();
 *   });
 * }
 * ```
 *
 * ```ts
 * // Inside ConfirmDialogComponent
 * readonly data = inject<{ message: string }>(DIALOG_DATA);
 * readonly ref = inject(DialogRef);
 * confirm() { this.ref.close(true); }
 * cancel() { this.ref.close(false); }
 * ```
 * @category Core/Overlays/Dialog
 */
@Injectable({ providedIn: 'root' })
export class KjDialogService {
  private readonly dialog = inject(Dialog);

  /**
   * Opens a component or template as a modal dialog.
   * @param content - Angular component type or template ref to render inside the dialog.
   * @param config - Optional configuration: data, panelClass, width, autoFocus, etc.
   * @returns A `DialogRef` whose `closed` observable emits the close result.
   */
  open<R = unknown, D = unknown, C = unknown>(
    content: Type<C> | TemplateRef<C>,
    config?: KjDialogOpenConfig<D>,
  ): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(content, {
      panelClass: ['kj-dialog-panel', ...(Array.isArray(config?.panelClass) ? config.panelClass : config?.panelClass ? [config.panelClass] : [])],
      backdropClass: 'kj-dialog-backdrop',
      autoFocus: config?.autoFocus ?? 'first-tabbable',
      restoreFocus: config?.restoreFocus ?? true,
      disableClose: config?.disableClose ?? false,
      data: config?.data,
      width: config?.width,
      maxWidth: config?.maxWidth,
      height: config?.height,
    } as DialogConfig<D, DialogRef<R, C>>);
  }
}
