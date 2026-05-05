import { Component } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import {
  KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-default-example',
  standalone: true,
  imports: [KjDialogTrigger, KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <button [kjDialogTrigger]="dlg">Open dialog</button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog>
          <kj-dialog-title>Hello</kj-dialog-title>
          <p>This is a styled dialog.</p>
          <kj-dialog-close>Close</kj-dialog-close>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogDefaultExample {}
