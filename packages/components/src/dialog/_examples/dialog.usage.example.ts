import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDialog, KjDialogRef, KjDialogService } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

/**
 * A walkthrough of the most common dialog usages — open a body, resolve the
 * confirmation via the typed `KjDialogRef`, and react to the result through
 * `afterClosed$`.
 */
@Component({
  selector: 'kj-dialog-usage-body',
  standalone: true,
  imports: [KjDialog, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-dialog>
      <h2 style="margin:0 0 var(--kj-space-md)">Save changes?</h2>
      <p>Your edits will be applied immediately.</p>
      <div
        style="display:flex; gap: var(--kj-space-sm); justify-content: flex-end; margin-top: var(--kj-space-lg)"
      >
        <kj-button kjVariant="ghost" (click)="ref.close(false)">Cancel</kj-button>
        <kj-button kjVariant="default" (click)="ref.close(true)">Save</kj-button>
      </div>
    </kj-dialog>
  `,
})
class DialogUsageBody {
  protected readonly ref = inject<KjDialogRef<DialogUsageBody, boolean>>(KjDialogRef);
}

@Component({
  selector: 'kj-dialog-usage-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <kj-button (click)="openConfirm()">Open confirmation</kj-button> `,
})
export class KjDialogUsageExample {
  private readonly dialog = inject(KjDialogService);

  openConfirm(): void {
    const ref = this.dialog.open<DialogUsageBody, boolean>(DialogUsageBody);
    ref.afterClosed$.subscribe((result) => {
      /* handle the confirmation result */
      void result;
    });
  }
}
