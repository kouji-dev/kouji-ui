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
 * Confirm popup with a longer multi-sentence message. The `<p>` is marked
 * with `kjConfirmPopupMessage` so its id is wired to the panel's
 * `aria-describedby`. Two sentences is roughly the practical ceiling for an
 * anchored confirm — anything longer wants the centred `KjAlertDialog`.
 */
@Component({
  selector: 'kj-confirm-popup-with-message-example',
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
        display: block;
        min-height: 14rem;
      }
      .kj-confirm-popup-example__status {
        margin-top: var(--kj-space-md);
        color: var(--kj-color-base-content);
        opacity: 0.85;
        font-size: 0.875rem;
      }
    `,
  ],
  template: `
    <kj-confirm-popup (kjResult)="onResult($event)">
      <kj-button kjConfirmPopupTrigger #trig="kjConfirmPopupTrigger" kjVariant="default"
        >Discard draft</kj-button
      >
      <kj-confirm-popup-content [kjFor]="trig">
        <p kjConfirmPopupMessage>
          Discard this draft? Your changes since last save will be lost and cannot be recovered from
          this device.
        </p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel>
            <kj-button kjVariant="ghost">Keep editing</kj-button>
          </kj-confirm-popup-cancel>
          <kj-confirm-popup-action>
            <kj-button kjVariant="default">Discard</kj-button>
          </kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>
    <p class="kj-confirm-popup-example__status">Last result: {{ status() }}</p>
  `,
})
export class KjConfirmPopupWithMessageExample {
  readonly status = signal<string>('—');
  onResult(result: boolean): void {
    this.status.set(result ? 'discarded' : 'kept');
  }
}
