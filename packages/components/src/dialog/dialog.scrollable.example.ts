import { Component } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDialogComponent, KjDialogOverlayComponent,
  KjDialogHeaderComponent, KjDialogTitleComponent,
  KjDialogBodyComponent, KjDialogFooterComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-scrollable-example',
  standalone: true,
  imports: [
    KjDialogTrigger, KjButtonComponent,
    KjDialogComponent, KjDialogOverlayComponent,
    KjDialogHeaderComponent, KjDialogTitleComponent,
    KjDialogBodyComponent, KjDialogFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDialogTrigger]="dlg">Read more</kj-button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog #d="kjDialog">
          <kj-dialog-header>
            <kj-dialog-title>Terms of service</kj-dialog-title>
          </kj-dialog-header>
          <kj-dialog-body [scroll]="true" style="max-height: 16rem;">
            @for (i of items; track i) {
              <p>Paragraph {{ i }}: lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            }
          </kj-dialog-body>
          <kj-dialog-footer>
            <kj-button (click)="d.close()">Close</kj-button>
          </kj-dialog-footer>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogScrollableExample {
  readonly items = Array.from({ length: 30 }, (_, i) => i + 1);
}
