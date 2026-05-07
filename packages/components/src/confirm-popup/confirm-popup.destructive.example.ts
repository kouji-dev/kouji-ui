import { Component, signal } from '@angular/core';
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
 * Destructive confirm popup — `[kjDestructive]="true"` flows through the
 * confirm popup context to the action button, which renders with the
 * `destructive` variant for the AAA-contrast danger token.
 */
@Component({
  selector: 'kj-confirm-popup-destructive-example',
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
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 14rem; }
    .kj-confirm-popup-example__status { margin-top: var(--kj-space-md); color: var(--kj-color-base-content); opacity: 0.85; font-size: 0.875rem; }
  `],
  template: `
    <kj-confirm-popup
      [kjDestructive]="true"
      (kjResult)="onResult($event)">
      <kj-confirm-popup-trigger>
        <kj-button kjVariant="destructive">Delete row</kj-button>
      </kj-confirm-popup-trigger>
      <kj-confirm-popup-content>
        <p kjConfirmPopupMessage>Delete this row? This cannot be undone.</p>
        <kj-confirm-popup-actions>
          <kj-confirm-popup-cancel>
            <kj-button kjVariant="ghost">Cancel</kj-button>
          </kj-confirm-popup-cancel>
          <kj-confirm-popup-action>
            <kj-button kjVariant="destructive">Delete</kj-button>
          </kj-confirm-popup-action>
        </kj-confirm-popup-actions>
      </kj-confirm-popup-content>
    </kj-confirm-popup>
    <p class="kj-confirm-popup-example__status">Last result: {{ status() }}</p>
  `,
})
export class KjConfirmPopupDestructiveExample {
  readonly status = signal<string>('—');
  onResult(result: boolean): void {
    this.status.set(result ? 'confirmed' : 'cancelled');
  }
}
