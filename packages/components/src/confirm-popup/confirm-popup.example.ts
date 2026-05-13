import { Component, signal } from '@angular/core';
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
 * Default confirm popup — anchored confirmation for a delete action.
 *
 * Flat shape — `<kj-confirm-popup>` owns the state, the trigger button
 * (any element with `[kjConfirmPopupTrigger]`) anchors the panel, and
 * `<kj-confirm-popup-content [kjFor]="trig">` resolves the panel against
 * that trigger ref. The cancel button receives initial focus
 * (WCAG 3.3.4 *Error Prevention*).
 */
@Component({
  selector: 'kj-confirm-popup-example',
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
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); min-height: 14rem; }
    .kj-confirm-popup-example__row { display: flex; align-items: center; gap: var(--kj-space-md); }
    .kj-confirm-popup-example__status { color: var(--kj-fg-default); opacity: 0.85; font-size: 0.875rem; }
  `],
  template: `
    <div class="kj-confirm-popup-example__row">
      <kj-confirm-popup
        (kjResult)="onResult($event)">
        <kj-button kjConfirmPopupTrigger #trig="kjConfirmPopupTrigger" kjVariant="default">Delete item</kj-button>
        <kj-confirm-popup-content [kjFor]="trig">
          <p kjConfirmPopupMessage class="kj-confirm-popup-message">Delete this item?</p>
          <kj-confirm-popup-actions>
            <kj-confirm-popup-cancel>
              <kj-button kjVariant="ghost">Cancel</kj-button>
            </kj-confirm-popup-cancel>
            <kj-confirm-popup-action>
              <kj-button kjVariant="default">Delete</kj-button>
            </kj-confirm-popup-action>
          </kj-confirm-popup-actions>
        </kj-confirm-popup-content>
      </kj-confirm-popup>
      <span class="kj-confirm-popup-example__status">Last result: {{ status() }}</span>
    </div>
  `,
})
export class KjConfirmPopupExample {
  readonly status = signal<string>('—');
  onResult(result: boolean): void {
    this.status.set(result ? 'confirmed' : 'cancelled');
  }
}
