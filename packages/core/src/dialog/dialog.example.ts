import { Component } from '@angular/core';
import { KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose } from './dialog';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-dialog-basic',
  standalone: true,
  imports: [KjDialogTrigger, KjDialog, KjDialogOverlay, KjDialogTitle, KjDialogClose, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 160px; }
    button[kjButton] { padding: 0.5rem 1.5rem; border: var(--kj-btn-border); cursor: pointer; font-family: var(--kj-font); font-size: 0.875rem; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-border); }
    ::ng-deep .kj-dialog-backdrop { background: var(--kj-backdrop); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: var(--kj-surface); border: 1px solid var(--kj-border); border-radius: var(--kj-radius-lg); padding: 1.5rem; min-width: 20rem; color: var(--kj-text); font-family: var(--kj-font); box-shadow: var(--kj-shadow-hard); }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1.125rem; color: var(--kj-text); }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: var(--kj-text-muted); line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    ::ng-deep .dialog-actions button[kjButton] { padding: 0.4rem 1rem; font-size: 0.8125rem; }
  `],
  template: `
    <button kjButton [kjVariant]="'default'" [kjDialogTrigger]="myDialog">Open Dialog</button>
    <ng-template #myDialog>
      <div kjDialogOverlay>
        <div kjDialog>
          <h2 kjDialogTitle>Edit Profile</h2>
          <p class="dialog-body">Make changes to your profile settings here.</p>
          <div class="dialog-actions">
            <button kjButton [kjVariant]="'outline'" kjDialogClose>Cancel</button>
            <button kjButton [kjVariant]="'default'" kjDialogClose>Save Changes</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DialogBasicExample {}
