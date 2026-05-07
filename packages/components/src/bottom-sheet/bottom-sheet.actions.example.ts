import { Component, signal } from '@angular/core';
import { KjBottomSheetTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjBottomSheetComponent,
  KjBottomSheetOverlayComponent,
  KjBottomSheetHeaderComponent,
  KjBottomSheetTitleComponent,
  KjBottomSheetBodyComponent,
} from './bottom-sheet';

/**
 * Action-sheet pattern: a list of mutually-exclusive actions presented as
 * a vertical menu, the canonical mobile action sheet.
 */
@Component({
  selector: 'kj-bottom-sheet-actions-example',
  standalone: true,
  imports: [
    KjBottomSheetTrigger, KjButtonComponent,
    KjBottomSheetComponent, KjBottomSheetOverlayComponent,
    KjBottomSheetHeaderComponent, KjBottomSheetTitleComponent,
    KjBottomSheetBodyComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    .actions { display: flex; flex-direction: column; gap: var(--kj-space-xs); padding: var(--kj-space-sm) var(--kj-space-md); }
    .actions button {
      all: unset;
      cursor: pointer;
      padding: var(--kj-space-md) var(--kj-space-lg);
      border-radius: var(--kj-radius-box);
      font: 0.9375rem / 1 var(--kj-font-sans);
      color: var(--kj-color-base-content);
      min-height: 44px;
      display: flex;
      align-items: center;
    }
    .actions button:hover, .actions button:focus-visible {
      background: var(--kj-color-base-200);
      outline: none;
    }
    .actions .destructive { color: var(--kj-color-error, #c83434); }
  `],
  template: `
    <kj-button [kjBottomSheetTrigger]="sheet" (kjBottomSheetClosed)="onResult($event)">
      More actions
    </kj-button>
    <p style="margin-top:1rem;">Last action: {{ result() ?? '—' }}</p>
    <ng-template #sheet>
      <kj-bottom-sheet-overlay>
        <kj-bottom-sheet #s="kjBottomSheet">
          <kj-bottom-sheet-header>
            <kj-bottom-sheet-title>Item options</kj-bottom-sheet-title>
          </kj-bottom-sheet-header>
          <kj-bottom-sheet-body [padded]="false">
            <div class="actions" role="group" aria-label="Item options">
              <button type="button" (click)="s.close('share')">Share</button>
              <button type="button" (click)="s.close('save')">Save for later</button>
              <button type="button" (click)="s.close('archive')">Archive</button>
              <button type="button" class="destructive" (click)="s.close('delete')">Delete</button>
            </div>
          </kj-bottom-sheet-body>
        </kj-bottom-sheet>
      </kj-bottom-sheet-overlay>
    </ng-template>
  `,
})
export class KjBottomSheetActionsExample {
  readonly result = signal<string | null>(null);
  onResult(value: unknown): void { this.result.set(value as string | null); }
}
