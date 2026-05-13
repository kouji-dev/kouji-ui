import { Component } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import {
  KjAlertActionsComponent,
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertDismissComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
} from './alert';

/**
 * Error alert with action buttons (Retry / View details) inside
 * `<kj-alert-actions>` — wraps the buttons in a `role="group"` so
 * AT can skip past them as a unit.
 */
@Component({
  selector: 'kj-alert-with-actions-example',
  standalone: true,
  imports: [
    KjAlertComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
    KjAlertActionsComponent,
    KjAlertDismissComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-alert kjVariant="error">
      <kj-alert-icon>!</kj-alert-icon>
      <kj-alert-title>Could not save draft</kj-alert-title>
      <kj-alert-description>Network request timed out after 30 seconds.</kj-alert-description>
      <kj-alert-actions kjAlertActionsLabel="Recovery actions">
        <kj-button kjVariant="default" kjSize="sm" (click)="onRetry()">Retry</kj-button>
        <kj-button kjVariant="ghost" kjSize="sm" (click)="onDetails()">View details</kj-button>
      </kj-alert-actions>
      <kj-alert-dismiss />
    </kj-alert>
  `,
})
export class KjAlertWithActionsExample {
  onRetry(): void { /* example: trigger retry */ }
  onDetails(): void { /* example: open details */ }
}
