import { Component } from '@angular/core';
import { KjBottomSheetTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';
import {
  KjBottomSheetComponent,
  KjBottomSheetOverlayComponent,
  KjBottomSheetHeaderComponent,
  KjBottomSheetTitleComponent,
  KjBottomSheetBodyComponent,
  KjBottomSheetFooterComponent,
} from './bottom-sheet';

@Component({
  selector: 'kj-bottom-sheet-with-form-example',
  standalone: true,
  imports: [
    KjBottomSheetTrigger, KjButtonComponent, KjInputComponent,
    KjBottomSheetComponent, KjBottomSheetOverlayComponent,
    KjBottomSheetHeaderComponent, KjBottomSheetTitleComponent,
    KjBottomSheetBodyComponent, KjBottomSheetFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjBottomSheetTrigger]="sheet">New comment</kj-button>
    <ng-template #sheet>
      <kj-bottom-sheet-overlay>
        <kj-bottom-sheet #s="kjBottomSheet">
          <kj-bottom-sheet-header>
            <kj-bottom-sheet-title>Add a comment</kj-bottom-sheet-title>
          </kj-bottom-sheet-header>
          <kj-bottom-sheet-body>
            <form
              (submit)="$event.preventDefault(); s.close('saved')"
              style="display:flex;flex-direction:column;gap:1rem;"
            >
              <label for="bottom-sheet-message" style="display:flex;flex-direction:column;gap:0.25rem;">
                <span>Message</span>
                <kj-input id="bottom-sheet-message" type="text" placeholder="Looks great!" />
              </label>
            </form>
          </kj-bottom-sheet-body>
          <kj-bottom-sheet-footer>
            <kj-button kjVariant="ghost" (click)="s.close()">Cancel</kj-button>
            <kj-button kjType="submit" (click)="s.close('saved')">Post</kj-button>
          </kj-bottom-sheet-footer>
        </kj-bottom-sheet>
      </kj-bottom-sheet-overlay>
    </ng-template>
  `,
})
export class KjBottomSheetWithFormExample {}
