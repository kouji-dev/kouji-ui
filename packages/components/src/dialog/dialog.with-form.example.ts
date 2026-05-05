import { Component } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import {
  KjDialogComponent, KjDialogOverlayComponent,
  KjDialogHeaderComponent, KjDialogTitleComponent,
  KjDialogBodyComponent, KjDialogFooterComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-with-form-example',
  standalone: true,
  imports: [
    KjDialogTrigger, KjButtonComponent, KjInputComponent,
    KjDialogComponent, KjDialogOverlayComponent,
    KjDialogHeaderComponent, KjDialogTitleComponent,
    KjDialogBodyComponent, KjDialogFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDialogTrigger]="dlg">New project</kj-button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog #d="kjDialog">
          <kj-dialog-header>
            <kj-dialog-title>New project</kj-dialog-title>
          </kj-dialog-header>
          <kj-dialog-body>
            <form (submit)="$event.preventDefault(); d.close('saved')" style="display:flex;flex-direction:column;gap:1rem;">
              <div style="display:flex;flex-direction:column;gap:0.25rem;">
                <span id="dlg-form-project-name">Project name</span>
                <kj-input type="text" placeholder="My project" />
              </div>
            </form>
          </kj-dialog-body>
          <kj-dialog-footer>
            <kj-button variant="ghost" (click)="d.close()">Cancel</kj-button>
            <kj-button type="submit" (click)="d.close('saved')">Save</kj-button>
          </kj-dialog-footer>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogWithFormExample {}
