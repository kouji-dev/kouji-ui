import { Component } from '@angular/core';
import {
  KjDialogTrigger, KjDialog, KjDialogOverlay,
  KjDialogTitle, KjDialogClose,
} from './dialog';

@Component({
  selector: 'kj-example-dialog-retro',
  standalone: true,
  imports: [
    KjDialogTrigger, KjDialog, KjDialogOverlay,
    KjDialogTitle, KjDialogClose,
  ],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: #fef9c3; font-family: 'Courier New', monospace; min-height: 160px; color: #000; }
    button {
      padding: 0.4rem 1rem; font-family: 'Courier New', monospace; font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: #000; color: #fef9c3;
      border: 2px solid #000; cursor: pointer;
      box-shadow: 3px 3px 0 #000; transition: transform 0.08s, box-shadow 0.08s;
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #000; }
    ::ng-deep .kj-dialog-backdrop { background: rgba(0,0,0,0.6); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: #fef9c3; border: 2px solid #000; padding: 1.5rem; min-width: 20rem; box-shadow: 6px 6px 0 #000; font-family: 'Courier New', monospace; color: #000; }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #000; padding-bottom: 0.5rem; color: #000; }
    ::ng-deep .dialog-body { margin: 0.75rem 0 1.5rem; font-size: 0.8rem; color: #444; line-height: 1.6; }
    ::ng-deep .dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    ::ng-deep [kjDialogOverlay] button { font-size: 0.75rem; padding: 0.3rem 0.875rem; box-shadow: 2px 2px 0 #000; }
    ::ng-deep [kjDialogOverlay] button:hover { box-shadow: 3px 3px 0 #000; }
    ::ng-deep .btn-primary { background: #16a34a; color: #fff; }
  `],
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
