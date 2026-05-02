import { Component } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from './dialog';

@Component({
  selector: 'kj-example-dialog-retro',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; color: var(--kj-text); }
    button {
      padding: 0.4rem 1rem; font-family: var(--kj-font); font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: var(--kj-surface); color: var(--kj-text);
      border: var(--kj-btn-border); cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: var(--kj-btn-border); padding: 1.5rem; min-width: 20rem; box-shadow: var(--kj-shadow-hard); font-family: var(--kj-font); color: var(--kj-text); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid var(--kj-border); padding-bottom: 0.5rem; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0.75rem 0 1.5rem; font-size: 0.8rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { font-size: 0.75rem; padding: 0.3rem 0.875rem; box-shadow: var(--kj-shadow-sm); }
    ::ng-deep [kjDialogOverlay] button:hover { box-shadow: var(--kj-shadow-md); }
    ::ng-deep .btn-primary { background: var(--kj-accent); color: var(--kj-accent-on); }
  `],
  host: { class: 'kj-theme-retro' },
  template: `
    <button [kjDialogTrigger]="myDialog">Open Dialog</button>
    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button kjDialogClose>Cancel</button>
            <button class="btn-primary" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogRetroExample {}
