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
  selector: 'kj-bottom-sheet-example',
  standalone: true,
  imports: [
    KjBottomSheetTrigger, KjButtonComponent,
    KjBottomSheetComponent, KjBottomSheetOverlayComponent,
    KjBottomSheetHeaderComponent, KjBottomSheetTitleComponent,
    KjBottomSheetBodyComponent, KjBottomSheetFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjBottomSheetTrigger]="sheet">Open bottom sheet</kj-button>
    <ng-template #sheet>
      <kj-bottom-sheet-overlay>
        <kj-bottom-sheet #s="kjBottomSheet">
          <kj-bottom-sheet-header>
            <kj-bottom-sheet-title>Quick action</kj-bottom-sheet-title>
          </kj-bottom-sheet-header>
          <kj-bottom-sheet-body>
            Slides up from the bottom. Escape, backdrop, or the close button
            dismisses it.
          </kj-bottom-sheet-body>
          <kj-bottom-sheet-footer>
            <kj-button kjVariant="ghost" (click)="s.close()">Close</kj-button>
          </kj-bottom-sheet-footer>
        </kj-bottom-sheet>
      </kj-bottom-sheet-overlay>
    </ng-template>
  `,
})
export class KjBottomSheetExample {}
