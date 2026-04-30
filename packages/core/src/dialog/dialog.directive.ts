import {
  Directive, DestroyRef, TemplateRef, ViewContainerRef,
  computed, inject, input, output, signal,
} from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { KJ_DIALOG, KjDialogContext } from './dialog.context';

let _dialogIdCounter = 0;

/**
 * Trigger that opens the dialog. Place on any button or interactive element.
 * Takes a `TemplateRef` input that defines the full overlay structure.
 *
 * The template should contain `[kjDialogOverlay]` (backdrop) wrapping `[kjDialog]` (panel).
 * Inside the panel use `[kjDialogTitle]` and `[kjDialogClose]`.
 * Export `kjDialog` as a template ref (`#dlg="kjDialog"`) to call `dlg.close(result?)`.
 *
 * @example
 * ```html
 * <button kjButton [kjDialogTrigger]="myDialog" (kjDialogClosed)="onResult($event)">Open</button>
 *
 * <ng-template #myDialog>
 *   <div kjDialogOverlay>
 *     <div kjDialog #dlg="kjDialog">
 *       <h2 kjDialogTitle>Title</h2>
 *       <button kjDialogClose>Cancel</button>
 *       <button (click)="dlg.close('saved')">Save</button>
 *     </div>
 *   </div>
 * </ng-template>
 * ```
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file dialog.example.ts
 *    @doc-theme retro
 *      @doc-file dialog.retro.example.ts
 *    @doc-theme finance
 *      @doc-file dialog.finance.example.ts
 *  @doc-example Confirmation
 *    @doc-file dialog.confirm.example.ts
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogTrigger]',
  standalone: true,
  providers: [{ provide: KJ_DIALOG, useExisting: KjDialogTriggerDirective }],
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open().toString()',
    '(click)': 'openDialog()',
  },
})
export class KjDialogTriggerDirective implements KjDialogContext {
  private readonly cdkDialog = inject(Dialog);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly kjDialogTrigger = input.required<TemplateRef<unknown>>();
  readonly kjDialogCloseOnEscape = input<boolean>(true);
  readonly kjDialogCloseOnBackdrop = input<boolean>(true);
  readonly kjDialogClosed = output<unknown>();

  readonly dialogId = `kj-dialog-${++_dialogIdCounter}`;

  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();
  readonly closeOnEscape = computed(() => this.kjDialogCloseOnEscape());
  readonly closeOnBackdrop = computed(() => this.kjDialogCloseOnBackdrop());

  private dialogRef?: DialogRef<unknown>;

  openDialog(): void {
    if (this._open()) return;
    this.dialogRef = this.cdkDialog.open(this.kjDialogTrigger(), {
      viewContainerRef: this.vcr,
      disableClose: !this.kjDialogCloseOnEscape(),
      backdropClass: 'kj-dialog-backdrop',
      panelClass: 'kj-dialog-panel',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    this._open.set(true);
    this.dialogRef.closed.subscribe(result => {
      this._open.set(false);
      this.kjDialogClosed.emit(result);
    });
    this.destroyRef.onDestroy(() => this.dialogRef?.close());
  }

  close(result?: unknown): void {
    this.dialogRef?.close(result);
    this._open.set(false);
  }
}

/**
 * Panel container for the dialog. Place inside the template provided to `[kjDialogTrigger]`.
 * Auto-sets `role="dialog"`, `aria-modal`, and `aria-labelledby` (requires `[kjDialogTitle]` inside).
 * Export as `#dlg="kjDialog"` to call `dlg.close(result?)` from event handlers.
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialog]',
  standalone: true,
  exportAs: 'kjDialog',
  host: {
    '[attr.role]': '"dialog"',
    '[attr.aria-modal]': '"true"',
    '[attr.aria-labelledby]': 'ctx.dialogId + "-title"',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjDialogDirective {
  readonly ctx = inject(KJ_DIALOG);

  close(result?: unknown): void {
    this.ctx.close(result);
  }
}

/**
 * Backdrop/overlay element. Place inside the template wrapping `[kjDialog]`.
 * Closes the dialog on click when `[kjDialogOverlayCloseOnClick]` is true (default).
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogOverlay]',
  standalone: true,
  host: {
    '(click)': 'onOverlayClick()',
  },
})
export class KjDialogOverlayDirective {
  private readonly ctx = inject(KJ_DIALOG);
  readonly kjDialogOverlayCloseOnClick = input<boolean>(true);

  onOverlayClick(): void {
    if (this.ctx.closeOnBackdrop() && this.kjDialogOverlayCloseOnClick()) {
      this.ctx.close();
    }
  }
}

/**
 * Marks the dialog title. Sets `id` for `aria-labelledby` wiring on `[kjDialog]`.
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'ctx.dialogId + "-title"',
  },
})
export class KjDialogTitleDirective {
  readonly ctx = inject(KJ_DIALOG);
}

/**
 * Closes the dialog on click without a result value.
 * For closing with a result, use `#dlg="kjDialog"` then `(click)="dlg.close(value)"`.
 *
 * @category Core/Overlays/Dialog
 */
@Directive({
  selector: '[kjDialogClose]',
  standalone: true,
  host: {
    '(click)': 'ctx.close()',
  },
})
export class KjDialogCloseDirective {
  readonly ctx = inject(KJ_DIALOG);
}
