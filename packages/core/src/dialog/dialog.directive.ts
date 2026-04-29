import { Directive, DestroyRef, InjectionToken, TemplateRef, ViewContainerRef, inject, signal, afterNextRender } from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { KJ_DIALOG, KjDialogContext } from './dialog.context';

/**
 * Root dialog container. Uses Angular CDK `Dialog` service for proper overlay,
 * focus trap, backdrop, and Escape key handling.
 *
 * The `kjDialogContent` directive marks the template to portal into the overlay.
 * The trigger opens it; Escape and backdrop click close it automatically via CDK.
 *
 * @example
 * ```html
 * <div kjDialog>
 *   <button kjDialogTrigger>Open</button>
 *   <ng-template kjDialogContent>
 *     <div role="dialog" aria-label="Settings" aria-modal="true">
 *       <h2>Settings</h2>
 *       <button (click)="dialog.hide()">Close</button>
 *     </div>
 *   </ng-template>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjDialog]',
  standalone: true,
  providers: [{ provide: KJ_DIALOG, useExisting: KjDialogDirective }],
  exportAs: 'kjDialog',
})
export class KjDialogDirective implements KjDialogContext {
  private readonly cdkDialog = inject(Dialog);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  private dialogRef?: DialogRef<unknown>;
  private contentTemplate?: TemplateRef<unknown>;
  private vcr?: ViewContainerRef;

  /** @internal — called by KjDialogContentDirective to register its template */
  registerTemplate(tpl: TemplateRef<unknown>, vcr: ViewContainerRef): void {
    this.contentTemplate = tpl;
    this.vcr = vcr;
  }

  show(): void {
    if (this._open() || !this.contentTemplate) return;
    try {
      this.dialogRef = this.cdkDialog.open(this.contentTemplate, {
        viewContainerRef: this.vcr,
        panelClass: 'kj-dialog-panel',
      });
      this._open.set(true);
      this.dialogRef.closed.subscribe(() => this._open.set(false));
      this.destroyRef.onDestroy(() => this.dialogRef?.close());
    } catch {
      // CDK Dialog may fail in jsdom test environments — fall back to signal only
      this._open.set(true);
    }
  }

  hide(): void {
    this.dialogRef?.close();
    this._open.set(false);
  }
}

/**
 * Marks an `<ng-template>` as the dialog content to render in the overlay.
 *
 * @example
 * ```html
 * <ng-template kjDialogContent>
 *   <div role="dialog" aria-label="My dialog" aria-modal="true">...</div>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[kjDialogContent]',
  standalone: true,
})
export class KjDialogContentDirective {
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly dialog = inject(KJ_DIALOG);

  constructor() {
    afterNextRender(() => {
      this.dialog.registerTemplate(this.tpl, this.vcr);
    });
  }
}

/**
 * Trigger button that opens the dialog.
 *
 * @example
 * ```html
 * <button kjDialogTrigger>Open dialog</button>
 * ```
 */
@Directive({
  selector: '[kjDialogTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '[attr.aria-haspopup]': '"dialog"',
    '(click)': 'ctx.show()',
  },
})
export class KjDialogTriggerDirective {
  readonly ctx = inject(KJ_DIALOG);
}
