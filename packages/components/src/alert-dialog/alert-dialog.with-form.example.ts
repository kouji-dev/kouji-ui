import { Component, signal } from '@angular/core';
import { KjAlertDialogTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
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
 * Confirmation alert dialog gated by typed input. The action button is
 * disabled until the user types the exact confirmation phrase ("DELETE"),
 * mirroring GitHub-style irreversible-action UX.
 */
@Component({
  selector: 'kj-alert-dialog-with-form-example',
  standalone: true,
  imports: [
    KjAlertDialogTrigger, KjButtonComponent, KjInputComponent,
    KjAlertDialogComponent, KjAlertDialogOverlayComponent,
    KjAlertDialogTitleComponent, KjAlertDialogDescriptionComponent,
    KjAlertDialogFooterComponent,
    KjAlertDialogActionComponent, KjAlertDialogCancelComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button
      [kjAlertDialogTrigger]="dlg"
      [kjAlertDialogDestructive]="true"
      (kjAlertDialogClosed)="onResult($event)"
    >
      Delete repository
    </kj-button>
    <p style="margin-top: 1rem;">Last result: {{ result() ?? '—' }}</p>
    <ng-template #dlg>
      <kj-alert-dialog-overlay>
        <kj-alert-dialog>
          <kj-alert-dialog-title>Delete repository?</kj-alert-dialog-title>
          <kj-alert-dialog-description>
            Type <strong>DELETE</strong> below to confirm.
          </kj-alert-dialog-description>
          <kj-input
            type="text"
            placeholder="DELETE"
            [value]="phrase()"
            (input)="phrase.set($any($event.target).value)"
          />
          <kj-alert-dialog-footer>
            <kj-alert-dialog-cancel>
              <kj-button kjVariant="ghost">Cancel</kj-button>
            </kj-alert-dialog-cancel>
            <kj-alert-dialog-action>
              <kj-button kjVariant="destructive" [kjDisabled]="phrase() !== 'DELETE'">
                Delete forever
              </kj-button>
            </kj-alert-dialog-action>
          </kj-alert-dialog-footer>
        </kj-alert-dialog>
      </kj-alert-dialog-overlay>
    </ng-template>
  `,
})
export class KjAlertDialogWithFormExample {
  readonly phrase = signal<string>('');
  readonly result = signal<string | null>(null);
  onResult(value: unknown): void {
    this.phrase.set('');
    this.result.set(value === true ? 'deleted' : value === false ? 'cancelled' : null);
  }
}
