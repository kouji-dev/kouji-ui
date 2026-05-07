import { Component } from '@angular/core';
import {
  KjConfirmPopupActionComponent,
  KjConfirmPopupActionsComponent,
  KjConfirmPopupCancelComponent,
  KjConfirmPopupComponent,
  KjConfirmPopupContentComponent,
  KjConfirmPopupMessageComponent,
  KjConfirmPopupTriggerComponent,
} from './confirm-popup';
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
    KjConfirmPopupTriggerComponent,
    KjConfirmPopupContentComponent,
    KjConfirmPopupMessageComponent,
    KjConfirmPopupActionComponent,
    KjConfirmPopupCancelComponent,
    KjConfirmPopupActionsComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host {
      display: flex;
      gap: var(--kj-space-md);
      flex-wrap: wrap;
      padding: var(--kj-space-2xl);
      background: var(--kj-color-base-200);
      min-height: 16rem;
    }
  `],
  template: `
    <kj-confirm-popup>
      <kj-confirm-popup-trigger>
        <kj-button>Top</kj-button>
      </kj-confirm-popup-trigger>
      <kj-confirm-popup-content>
        <p kjConfirmPopupMessage>Confirm action above the trigger.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel>
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>

    <kj-confirm-popup>
      <kj-confirm-popup-trigger>
        <kj-button>Right</kj-button>
      </kj-confirm-popup-trigger>
      <kj-confirm-popup-content>
        <p kjConfirmPopupMessage>Confirm action to the right.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel>
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>

    <kj-confirm-popup>
      <kj-confirm-popup-trigger>
        <kj-button>Bottom</kj-button>
      </kj-confirm-popup-trigger>
      <kj-confirm-popup-content>
        <p kjConfirmPopupMessage>Confirm action below the trigger.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel>
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>

    <kj-confirm-popup>
      <kj-confirm-popup-trigger>
        <kj-button>Left</kj-button>
      </kj-confirm-popup-trigger>
      <kj-confirm-popup-content>
        <p kjConfirmPopupMessage>Confirm action to the left.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel>
          <kj-confirm-popup-action><kj-button>OK</kj-button></kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>
  `,
})
export class KjConfirmPopupPlacementExample {}
