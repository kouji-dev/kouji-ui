import { Component } from '@angular/core';
import { KjBottomSheetTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjBottomSheetComponent,
  KjBottomSheetOverlayComponent,
  KjBottomSheetHeaderComponent,
  KjBottomSheetTitleComponent,
  KjBottomSheetBodyComponent,
  KjBottomSheetFooterComponent,
} from './bottom-sheet';

@Component({
  selector: 'kj-bottom-sheet-scrollable-example',
  standalone: true,
  imports: [
    KjBottomSheetTrigger, KjButtonComponent,
    KjBottomSheetComponent, KjBottomSheetOverlayComponent,
    KjBottomSheetHeaderComponent, KjBottomSheetTitleComponent,
    KjBottomSheetBodyComponent, KjBottomSheetFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjBottomSheetTrigger]="sheet">Read details</kj-button>
    <ng-template #sheet>
      <kj-bottom-sheet-overlay>
        <kj-bottom-sheet #s="kjBottomSheet">
          <kj-bottom-sheet-header>
            <kj-bottom-sheet-title>Release notes</kj-bottom-sheet-title>
          </kj-bottom-sheet-header>
          <kj-bottom-sheet-body [scroll]="true" style="max-height: 18rem;">
            @for (i of items; track i) {
              <p>Note {{ i }} — lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            }
          </kj-bottom-sheet-body>
          <kj-bottom-sheet-footer>
            <kj-button (click)="s.close()">Close</kj-button>
          </kj-bottom-sheet-footer>
        </kj-bottom-sheet>
      </kj-bottom-sheet-overlay>
    </ng-template>
  `,
})
export class KjBottomSheetScrollableExample {
  readonly items = Array.from({ length: 30 }, (_, i) => i + 1);
}
