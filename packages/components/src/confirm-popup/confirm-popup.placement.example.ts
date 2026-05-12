import { Component } from '@angular/core';
import {
  KjConfirmPopupActionComponent,
  KjConfirmPopupActionsComponent,
  KjConfirmPopupCancelComponent,
  KjConfirmPopupComponent,
  KjConfirmPopupContentComponent,
  KjConfirmPopupMessageComponent,
} from './confirm-popup';
import { KjConfirmPopupTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

/**
 * Placement override — explicit `kjPopoverSide` for confirm popups in
 * unusual layouts (e.g. row-end actions in a long table where the default
 * `'top'` would fall outside the viewport on the first / last row).
 */
@Component({
  selector: 'kj-confirm-popup-placement-example',
  standalone: true,
  imports: [
    KjConfirmPopupComponent,
    KjConfirmPopupTrigger,
    KjConfirmPopupContentComponent,
    KjConfirmPopupMessageComponent,
    KjConfirmPopupActionComponent,
    KjConfirmPopupCancelComponent,
    KjConfirmPopupActionsComponent,
    KjButtonComponent,
  ],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-md);
        flex-wrap: wrap;
        min-height: 16rem;
      }
    `,
  ],
  template: `
    <kj-confirm-popup>
      <kj-button kjConfirmPopupTrigger #t1="kjConfirmPopupTrigger">Top</kj-button>
      <kj-confirm-popup-content [kjFor]="t1">
        <p kjConfirmPopupMessage>Confirm action above the trigger.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel
            ><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel
          >
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>

    <kj-confirm-popup>
      <kj-button kjConfirmPopupTrigger #t2="kjConfirmPopupTrigger">Right</kj-button>
      <kj-confirm-popup-content [kjFor]="t2">
        <p kjConfirmPopupMessage>Confirm action to the right.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel
            ><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel
          >
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>

    <kj-confirm-popup>
      <kj-button kjConfirmPopupTrigger #t3="kjConfirmPopupTrigger">Bottom</kj-button>
      <kj-confirm-popup-content [kjFor]="t3">
        <p kjConfirmPopupMessage>Confirm action below the trigger.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel
            ><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel
          >
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>

    <kj-confirm-popup>
      <kj-button kjConfirmPopupTrigger #t4="kjConfirmPopupTrigger">Left</kj-button>
      <kj-confirm-popup-content [kjFor]="t4">
        <p kjConfirmPopupMessage>Confirm action to the left.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel
            ><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel
          >
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>
  `,
})
export class KjConfirmPopupPlacementExample {}
