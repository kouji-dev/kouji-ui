import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjConfirmPopupTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';
import {
  KjConfirmPopupActionComponent,
  KjConfirmPopupActionsComponent,
  KjConfirmPopupCancelComponent,
  KjConfirmPopupComponent,
  KjConfirmPopupContentComponent,
  KjConfirmPopupMessageComponent,
} from '../confirm-popup';

/**
 * A walkthrough of the most common confirm-popup usages — a destructive
 * delete confirmation and a benign archive confirmation, both with two-way
 * `(kjResult)` handling.
 */
@Component({
  selector: 'kj-confirm-popup-usage-example',
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
        flex-direction: column;
        gap: var(--kj-space-md);
        padding: var(--kj-space-2xl);
        min-height: 16rem;
      }
      .row {
        display: flex;
        gap: var(--kj-space-md);
        align-items: center;
      }
      .status {
        font-size: 0.875rem;
        color: var(--kj-fg-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <kj-confirm-popup [kjDestructive]="true" (kjResult)="last.set('delete: ' + $event)">
        <kj-button kjConfirmPopupTrigger #t1="kjConfirmPopupTrigger" kjVariant="destructive"
          >Delete</kj-button
        >
        <kj-confirm-popup-content [kjFor]="t1">
          <p kjConfirmPopupMessage>Delete this item? This cannot be undone.</p>
          <kj-confirm-popup-actions>
            <kj-confirm-popup-cancel
              ><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel
            >
            <kj-confirm-popup-action
              ><kj-button kjVariant="destructive">Delete</kj-button></kj-confirm-popup-action
            >
          </kj-confirm-popup-actions>
        </kj-confirm-popup-content>
      </kj-confirm-popup>

      <kj-confirm-popup (kjResult)="last.set('archive: ' + $event)">
        <kj-button kjConfirmPopupTrigger #t2="kjConfirmPopupTrigger" kjVariant="outline"
          >Archive</kj-button
        >
        <kj-confirm-popup-content [kjFor]="t2">
          <p kjConfirmPopupMessage>Archive this conversation?</p>
          <kj-confirm-popup-actions>
            <kj-confirm-popup-cancel
              ><kj-button kjVariant="ghost">Cancel</kj-button></kj-confirm-popup-cancel
            >
            <kj-confirm-popup-action
              ><kj-button kjVariant="default">Archive</kj-button></kj-confirm-popup-action
            >
          </kj-confirm-popup-actions>
        </kj-confirm-popup-content>
      </kj-confirm-popup>
    </div>

    <span class="status">Last action: {{ last() }}</span>
  `,
})
export class KjConfirmPopupUsageExample {
  readonly last = signal<string>('—');
}
