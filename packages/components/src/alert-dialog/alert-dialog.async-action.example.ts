import { Component, signal } from '@angular/core';
import { KjAlertDialogTrigger } from '@kouji-ui/core';
import type { KjDialogCloseEvent } from '@kouji-ui/core';
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
 * Async-action example: the action button shows a loading state while a
 * simulated backend call resolves. While in flight we veto further close
 * requests through `(kjCloseRequested)` so the user cannot dismiss the
 * dialog mid-commit.
 */
@Component({
  selector: 'kj-alert-dialog-async-action-example',
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
      [kjAlertDialogTrigger]="dlg"
      [kjAlertDialogDestructive]="true"
      (kjAlertDialogClosed)="onResult($event)"
      (kjCloseRequested)="onCloseRequested($event)"
    >
      Archive project
    </kj-button>
    <p style="margin-top: 1rem;">Last result: {{ result() ?? '—' }}</p>
    <ng-template #dlg>
      <kj-alert-dialog-overlay>
        <kj-alert-dialog>
          <kj-alert-dialog-title>Archive this project?</kj-alert-dialog-title>
          <kj-alert-dialog-description>
            Archived projects are read-only. You can restore them later from
            settings.
          </kj-alert-dialog-description>
          <kj-alert-dialog-footer>
            <kj-alert-dialog-cancel>
              <kj-button kjVariant="ghost" [kjDisabled]="loading()">Cancel</kj-button>
            </kj-alert-dialog-cancel>
            <kj-alert-dialog-action>
              <kj-button
                kjVariant="destructive"
                [kjLoading]="loading()"
                (click)="commit()"
              >
                {{ loading() ? 'Archiving…' : 'Archive' }}
              </kj-button>
            </kj-alert-dialog-action>
          </kj-alert-dialog-footer>
        </kj-alert-dialog>
      </kj-alert-dialog-overlay>
    </ng-template>
  `,
})
export class KjAlertDialogAsyncActionExample {
  readonly loading = signal(false);
  readonly result = signal<string | null>(null);

  /**
   * The kj-button inside `<kj-alert-dialog-action>` triggers our async
   * commit, then we let the underlying directive close the dialog. The
   * action's automatic click→close(true) wiring still fires synchronously
   * BEFORE our async work — so we veto it via (kjCloseRequested) until
   * loading is false. We track an explicit `committed` flag to know when
   * to allow the close.
   */
  private committed = false;

  commit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);
      this.committed = true;
    }, 800);
  }

  onCloseRequested(ev: KjDialogCloseEvent): void {
    if (this.loading()) {
      ev.preventDefault();
      return;
    }
    if (ev.reason === 'close-button' && ev.result === true && !this.committed) {
      // First confirm click: kick off async work, veto close.
      ev.preventDefault();
      this.commit();
    }
  }

  onResult(value: unknown): void {
    this.committed = false;
    this.result.set(value === true ? 'archived' : value === false ? 'cancelled' : null);
  }
}
