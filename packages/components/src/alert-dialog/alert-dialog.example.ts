import { Component, signal } from '@angular/core';
import { KjAlertDialogTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjAlertDialogActionComponent,
  KjAlertDialogCancelComponent,
  KjAlertDialogComponent,
  KjAlertDialogDescriptionComponent,
  KjAlertDialogFooterComponent,
  KjAlertDialogOverlayComponent,
  KjAlertDialogTitleComponent,
} from './alert-dialog';

/**
 * Default alert-dialog example: a destructive confirm flow ("Delete item?")
 * using the `[kjAlertDialogTrigger]` declarative path.
 */
@Component({
  selector: 'kj-alert-dialog-example',
  standalone: true,
  imports: [
    KjAlertDialogTrigger, KjButtonComponent,
    KjAlertDialogComponent, KjAlertDialogOverlayComponent,
    KjAlertDialogTitleComponent, KjAlertDialogDescriptionComponent,
    KjAlertDialogFooterComponent,
    KjAlertDialogActionComponent, KjAlertDialogCancelComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjAlertDialogTrigger]="dlg" (kjAlertDialogClosed)="onResult($event)">
      Delete item
    </kj-button>
    <p style="margin-top: 1rem;">Last result: {{ result() ?? '—' }}</p>
    <ng-template #dlg>
      <kj-alert-dialog-overlay>
        <kj-alert-dialog>
          <kj-alert-dialog-title>Delete this item?</kj-alert-dialog-title>
          <kj-alert-dialog-description>
            This action cannot be undone.
          </kj-alert-dialog-description>
          <kj-alert-dialog-footer>
            <kj-alert-dialog-cancel>
              <kj-button kjVariant="ghost">Cancel</kj-button>
            </kj-alert-dialog-cancel>
            <kj-alert-dialog-action>
              <kj-button kjVariant="default">Delete</kj-button>
            </kj-alert-dialog-action>
          </kj-alert-dialog-footer>
        </kj-alert-dialog>
      </kj-alert-dialog-overlay>
    </ng-template>
  `,
})
export class KjAlertDialogExample {
  readonly result = signal<string | null>(null);
  onResult(value: unknown): void {
    this.result.set(value === true ? 'confirmed' : value === false ? 'cancelled' : null);
  }
}
