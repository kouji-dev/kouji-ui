import { Component } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDialogComponent, KjDialogOverlayComponent,
  KjDialogHeaderComponent, KjDialogTitleComponent,
  KjDialogBodyComponent, KjDialogFooterComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-default-example',
  standalone: true,
  imports: [
    KjDialogTrigger, KjButtonComponent,
    KjDialogComponent, KjDialogOverlayComponent,
    KjDialogHeaderComponent, KjDialogTitleComponent,
    KjDialogBodyComponent, KjDialogFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDialogTrigger]="dlg">Open dialog</kj-button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog #d="kjDialog">
          <kj-dialog-header>
            <kj-dialog-title>Hello</kj-dialog-title>
          </kj-dialog-header>
          <kj-dialog-body>This is a styled dialog.</kj-dialog-body>
          <kj-dialog-footer>
            <kj-button variant="ghost" (click)="d.close()">Close</kj-button>
          </kj-dialog-footer>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogDefaultExample {}
