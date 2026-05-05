import { Component } from '@angular/core';
import { KjDialogTrigger, KjButton } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import {
  KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-with-form-example',
  standalone: true,
  imports: [KjDialogTrigger, KjButton, KjButtonComponent, KjInputComponent, KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDialogTrigger]="dlg">New project</kj-button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog>
          <kj-dialog-title>New project</kj-dialog-title>
          <form (submit)="$event.preventDefault()" style="display:flex;flex-direction:column;gap:1rem;">
            <label style="display:flex;flex-direction:column;gap:0.25rem;">
              <span>Project name</span>
              <kj-input type="text" placeholder="My project" />
            </label>
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
              <kj-dialog-close>Cancel</kj-dialog-close>
              <button kjButton class="kj-button" type="submit">Save</button>
            </div>
          </form>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogWithFormExample {}
