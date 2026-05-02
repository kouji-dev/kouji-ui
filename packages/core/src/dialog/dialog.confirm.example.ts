import { Component, signal } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle } from './dialog';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-dialog-confirm',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; flex-direction: column; color: var(--kj-text); }
    .status { font-size: 0.8125rem; color: var(--kj-text-muted); min-height: 1.25rem; }
    .status.confirmed { color: var(--kj-accent); }
    .status.cancelled { color: var(--kj-destructive); }
    button[kjButton] { padding: 0.5rem 1.5rem; border: var(--kj-btn-border); cursor: pointer; font-family: var(--kj-font); font-size: 0.875rem; }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-border); }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: 1px solid var(--kj-border); border-radius: var(--kj-radius-lg); padding: 1.5rem; min-width: 22rem; color: var(--kj-text); font-family: var(--kj-font); box-shadow: var(--kj-shadow-hard); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1.125rem; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    ::ng-deep .dialog-actions button[kjButton] { padding: 0.4rem 1rem; font-size: 0.8125rem; }
  `],
  template: `
    <button kjButton [kjVariant]="'destructive'"
            [kjDialogTrigger]="confirmDialog"
            (kjDialogClosed)="onResult($event)">
      Delete Account
    </button>
    <ng-template #confirmDialog>
      <div kjDialogOverlay>
        <div kjDialog #dlg="kjDialog">
          <h2 kjDialogTitle>Are you absolutely sure?</h2>
          <p class="dialog-body">This action cannot be undone. All your data will be permanently removed.</p>
          <div class="dialog-actions">
            <button kjButton [kjVariant]="'outline'" (click)="dlg.close('cancelled')">Cancel</button>
            <button kjButton [kjVariant]="'destructive'" (click)="dlg.close('confirmed')">Yes, delete</button>
          </div>
        </div>
      </div>
    </ng-template>
    <span class="status"
          [class.confirmed]="result() === 'confirmed'"
          [class.cancelled]="result() === 'cancelled'">
      {{ result() === 'confirmed' ? '✓ Account deleted' : result() === 'cancelled' ? '✕ Cancelled' : '' }}
    </span>
  `,
})
export class DialogConfirmExample {
  readonly result = signal<'confirmed' | 'cancelled' | null>(null);
  onResult(value: unknown): void {
    if (value === 'confirmed' || value === 'cancelled') this.result.set(value);
  }
}
