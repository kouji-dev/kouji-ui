import { Component } from '@angular/core';
import { KjBottomSheetTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjBottomSheetComponent,
  KjBottomSheetOverlayComponent,
  KjBottomSheetHandleComponent,
  KjBottomSheetHeaderComponent,
  KjBottomSheetTitleComponent,
  KjBottomSheetBodyComponent,
} from './bottom-sheet';

@Component({
  selector: 'kj-bottom-sheet-with-handle-example',
  standalone: true,
  imports: [
    KjBottomSheetTrigger, KjButtonComponent,
    KjBottomSheetComponent, KjBottomSheetOverlayComponent,
    KjBottomSheetHandleComponent,
    KjBottomSheetHeaderComponent, KjBottomSheetTitleComponent,
    KjBottomSheetBodyComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button
      [kjBottomSheetTrigger]="sheet"
      [kjSnapPoints]="snapPoints"
      [kjSnapLabels]="snapLabels"
    >
      Open with snap points
    </kj-button>
    <ng-template #sheet>
      <kj-bottom-sheet-overlay>
        <kj-bottom-sheet>
          <kj-bottom-sheet-handle></kj-bottom-sheet-handle>
          <kj-bottom-sheet-header>
            <kj-bottom-sheet-title>Resize me</kj-bottom-sheet-title>
          </kj-bottom-sheet-header>
          <kj-bottom-sheet-body>
            Drag the handle to switch between peek, half, and full snap
            points. Keyboard users: focus the handle and press Up/Down.
          </kj-bottom-sheet-body>
        </kj-bottom-sheet>
      </kj-bottom-sheet-overlay>
    </ng-template>
  `,
})
export class KjBottomSheetWithHandleExample {
  readonly snapPoints = ['148px', 0.5, 0.95] as const;
  readonly snapLabels = ['Peek', 'Half', 'Full'] as const;
}
