import { Component } from '@angular/core';
import { KjDialogTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent,
} from './dialog';

@Component({
  selector: 'kj-dialog-scrollable-example',
  standalone: true,
  imports: [KjDialogTrigger, KjButtonComponent, KjDialogComponent, KjDialogOverlayComponent, KjDialogTitleComponent, KjDialogCloseComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDialogTrigger]="dlg">Read more</kj-button>
    <ng-template #dlg>
      <kj-dialog-overlay>
        <kj-dialog>
          <kj-dialog-title>Terms of service</kj-dialog-title>
          <div style="max-height:16rem; overflow:auto;">
            @for (i of items; track i) {
              <p>Paragraph {{ i }}: lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            }
          </div>
          <kj-dialog-close>Close</kj-dialog-close>
        </kj-dialog>
      </kj-dialog-overlay>
    </ng-template>
  `,
})
export class KjDialogScrollableExample {
  readonly items = Array.from({ length: 30 }, (_, i) => i + 1);
}
