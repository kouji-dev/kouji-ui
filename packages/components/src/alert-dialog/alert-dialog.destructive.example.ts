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
 * Destructive variant example: account deletion. The `kjAlertDialogDestructive`
 * input flows through the context and toggles `data-destructive` on both the
 * panel and the action button so the styled wrapper can emphasise the action.
 */
@Component({
  selector: 'kj-alert-dialog-destructive-example',
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
    <kj-button
      kjVariant="destructive"
      [kjAlertDialogTrigger]="dlg"
      [kjAlertDialogDestructive]="true"
      (kjAlertDialogClosed)="onResult($event)"
    >
      Delete account
    </kj-button>
    <p style="margin-top: 1rem;">Last result: {{ result() ?? '—' }}</p>
    <ng-template #dlg>
      <kj-alert-dialog-overlay>
        <kj-alert-dialog>
          <kj-alert-dialog-title>Delete account permanently?</kj-alert-dialog-title>
          <kj-alert-dialog-description>
            All your data, projects, and billing history will be removed. This
            is irreversible.
          </kj-alert-dialog-description>
          <kj-alert-dialog-footer>
            <kj-alert-dialog-cancel>
              <kj-button kjVariant="ghost">Keep my account</kj-button>
            </kj-alert-dialog-cancel>
            <kj-alert-dialog-action>
              <kj-button kjVariant="destructive">Yes, delete it</kj-button>
            </kj-alert-dialog-action>
          </kj-alert-dialog-footer>
        </kj-alert-dialog>
      </kj-alert-dialog-overlay>
    </ng-template>
  `,
})
export class KjAlertDialogDestructiveExample {
  readonly result = signal<string | null>(null);
  onResult(value: unknown): void {
    this.result.set(value === true ? 'deleted' : value === false ? 'kept' : null);
  }
}
