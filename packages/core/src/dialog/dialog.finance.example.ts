import { Component } from '@angular/core';
import {
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
} from './dialog.directive';

@Component({
  selector: 'kj-example-dialog-finance',
  standalone: true,
  imports: [
    KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
    KjDialogTitleDirective, KjDialogCloseDirective,
  ],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; min-height: 160px; }
    button {
      padding: 0.45rem 1.125rem; background: #3b82f6; color: #fff; border: 1px solid #3b82f6;
      border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.875rem; font-weight: 500;
    }
    button:hover { background: #2563eb; }
    ::ng-deep .kj-dialog-backdrop { background: rgba(0,0,0,0.4); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; min-width: 22rem; box-shadow: 0 20px 60px rgba(0,0,0,0.12); font-family: system-ui, -apple-system, sans-serif; color: #111827; }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.375rem; font-size: 1.0625rem; font-weight: 600; color: #111827; }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: #6b7280; line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { padding: 0.4rem 1rem; font-size: 0.8125rem; font-weight: 500; border-radius: 6px; }
    ::ng-deep .btn-cancel { background: #fff; color: #374151; border: 1px solid #d1d5db; }
    ::ng-deep .btn-cancel:hover { background: #f9fafb; }
    ::ng-deep .btn-primary { background: #3b82f6; color: #fff; border: 1px solid #3b82f6; }
    ::ng-deep .btn-primary:hover { background: #2563eb; }
  `],
  template: `
    <button [kjDialogTrigger]="myDialog">Open Dialog</button>

    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button class="btn-cancel" kjDialogClose>Cancel</button>
            <button class="btn-primary" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogFinanceExample {}
