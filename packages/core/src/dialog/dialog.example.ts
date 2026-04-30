import { Component } from '@angular/core';
import {
  KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
  KjDialogTitleDirective, KjDialogCloseDirective,
} from './dialog.directive';
import { KjButtonDirective } from '../button/button.directive';

@Component({
  selector: 'kj-example-dialog-basic',
  standalone: true,
  imports: [
    KjDialogTriggerDirective, KjDialogDirective, KjDialogOverlayDirective,
    KjDialogTitleDirective, KjDialogCloseDirective,
    KjButtonDirective,
  ],
  styles: [`
    :host { display: flex; align-items: center; justify-content: center; padding: 3rem 2rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 160px; }
    button[kjButton] { padding: 0.5rem 1.5rem; border: none; cursor: pointer; font-family: inherit; font-size: 0.875rem; transition: opacity 0.15s; }
    [data-variant="default"] { background: #b8f500; color: #0c0c0c; }
    [data-variant="outline"] { background: transparent; color: #f0ede6; border: 1px solid #444; }
    ::ng-deep .kj-dialog-backdrop { background: rgba(0,0,0,0.75); }
    ::ng-deep .kj-dialog-panel { background: transparent; box-shadow: none; }
    ::ng-deep [kjDialogOverlay] { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
    ::ng-deep [kjDialog] { background: #1a1a1a; border: 1px solid #333; padding: 1.5rem; min-width: 20rem; color: #f0ede6; font-family: 'JetBrains Mono', monospace; }
    ::ng-deep [kjDialogTitle] { margin: 0 0 0.5rem; font-size: 1.125rem; color: #f0ede6; }
    ::ng-deep .dialog-body { margin: 0 0 1.5rem; font-size: 0.875rem; color: #888; line-height: 1.6; }
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
