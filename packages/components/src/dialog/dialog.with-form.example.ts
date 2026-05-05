import { Component } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import {
  KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-with-form-example',
  standalone: true,
  imports: [KjDialogTrigger, KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <button [kjDialogTrigger]="dlg">New project</button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog>
          <kj-dialog-title>New project</kj-dialog-title>
          <form (submit)="$event.preventDefault()" style="display:flex;flex-direction:column;gap:1rem;">
            <label style="display:flex;flex-direction:column;gap:0.25rem;">
              <span>Project name</span>
              <input type="text" />
            </label>
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
              <kj-dialog-close>Cancel</kj-dialog-close>
              <button type="submit">Save</button>
            </div>
          </form>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogWithFormExample {}
