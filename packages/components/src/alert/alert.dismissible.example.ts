import { Component, signal } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import {
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertDismissComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
} from './alert';

/**
 * Consumer-managed visibility. The directive itself is stateless — clicking
 * the dismiss button fires `(kjAlertDismissed)`, the host clears its own
 * signal, the `@if` unmounts.
 */
@Component({
  selector: 'kj-alert-dismissible-example',
  standalone: true,
  imports: [
    KjAlertComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
    KjAlertDismissComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-md);
      padding: var(--kj-space-xl);
      background: var(--kj-color-base-200);
      min-height: 10rem;
    }
  `],
  template: `
    @if (visible()) {
      <kj-alert kjVariant="success" (kjAlertDismissed)="visible.set(false)">
        <kj-alert-icon>✓</kj-alert-icon>
        <kj-alert-title>Saved</kj-alert-title>
        <kj-alert-description>Your changes are saved. Click × to dismiss.</kj-alert-description>
        <kj-alert-dismiss />
      </kj-alert>
    } @else {
      <kj-button (click)="visible.set(true)">Re-show alert</kj-button>
    }
  `,
})
export class KjAlertDismissibleExample {
  readonly visible = signal(true);
}
