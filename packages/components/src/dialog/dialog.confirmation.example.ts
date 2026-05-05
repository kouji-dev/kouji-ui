import { Component, signal } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

@Component({
  selector: 'kj-dialog-confirmation-example',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose, KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDialogTrigger]="dlg" (kjDialogClosed)="onResult($event)">Delete item</kj-button>
    <p style="margin-top:1rem;">Last result: {{ result() ?? '—' }}</p>
    <ng-template #dlg>
      <div kjDialogOverlay class="kj-dialog-overlay">
        <div kjDialog #d="kjDialog" class="kj-dialog">
          <h2 kjDialogTitle class="kj-dialog-title">Delete this item?</h2>
          <p>This action cannot be undone.</p>
          <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
            <button type="button" kjDialogClose class="kj-dialog-close">Cancel</button>
            <kj-button variant="destructive" (click)="d.close('confirmed')">Delete</kj-button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class KjDialogConfirmationExample {
  readonly result = signal<string | null>(null);
  onResult(value: unknown): void { this.result.set(value as string | null); }
}
