import { Component } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from './dialog';

@Component({
  selector: 'kj-example-dialog-finance',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; }
    button {
      padding: 0.45rem 1.125rem; background: var(--kj-accent); color: var(--kj-accent-on);
      border: var(--kj-btn-border); border-color: var(--kj-accent);
      border-radius: var(--kj-radius-md); cursor: pointer; font-family: var(--kj-font); font-size: 0.875rem; font-weight: 500;
    }
    button:hover { background: #2563eb; }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: 1px solid var(--kj-border); border-radius: var(--kj-radius-lg); padding: 1.5rem; min-width: 22rem; box-shadow: var(--kj-shadow-hard); font-family: var(--kj-font); color: var(--kj-text); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.375rem; font-size: 1.0625rem; font-weight: 600; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { padding: 0.4rem 1rem; font-size: 0.8125rem; font-weight: 500; border-radius: var(--kj-radius-md); }
    ::ng-deep .btn-cancel { background: var(--kj-surface); color: var(--kj-text); border: 1px solid var(--kj-border); }
    ::ng-deep .btn-cancel:hover { background: var(--kj-bg); }
    ::ng-deep .btn-primary { background: var(--kj-accent); color: var(--kj-accent-on); border-color: var(--kj-accent); }
    ::ng-deep .btn-primary:hover { background: #2563eb; }
  `],
  host: { class: 'kj-theme-finance' },
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
