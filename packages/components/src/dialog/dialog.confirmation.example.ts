import { Component, signal } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDialogComponent, KjDialogOverlayComponent,
  KjDialogHeaderComponent, KjDialogTitleComponent,
  KjDialogBodyComponent, KjDialogFooterComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-confirmation-example',
  standalone: true,
  imports: [
    KjDialogTrigger, KjButtonComponent,
    KjDialogComponent, KjDialogOverlayComponent,
    KjDialogHeaderComponent, KjDialogTitleComponent,
    KjDialogBodyComponent, KjDialogFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDialogTrigger]="dlg" (kjDialogClosed)="onResult($event)">Delete item</kj-button>
    <p style="margin-top:1rem;">Last result: {{ result() ?? '—' }}</p>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog #d="kjDialog">
          <kj-dialog-header>
            <kj-dialog-title>Delete this item?</kj-dialog-title>
          </kj-dialog-header>
          <kj-dialog-body>This action cannot be undone.</kj-dialog-body>
          <kj-dialog-footer>
            <kj-button kjVariant="ghost" (click)="d.close()">Cancel</kj-button>
            <kj-button kjVariant="destructive" (click)="d.close('confirmed')">Delete</kj-button>
          </kj-dialog-footer>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogConfirmationExample {
  readonly result = signal<string | null>(null);
  onResult(value: unknown): void { this.result.set(value as string | null); }
}
