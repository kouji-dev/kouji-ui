import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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
 * Common alert shapes — info, success, error with retry action, and a
 * dismissible warning. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-alert-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjAlertComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
    KjAlertActionsComponent,
    KjAlertDismissComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: flex; flex-direction: column; gap: var(--kj-space-md); }`],
  template: `
    <kj-alert kjVariant="info">
      <kj-alert-icon>i</kj-alert-icon>
      <kj-alert-title>New theme tokens</kj-alert-title>
      <kj-alert-description>Try the brutalist preset in your settings.</kj-alert-description>
    </kj-alert>

    <kj-alert kjVariant="error">
      <kj-alert-icon>!</kj-alert-icon>
      <kj-alert-title>Could not save draft</kj-alert-title>
      <kj-alert-description>Network request timed out.</kj-alert-description>
      <kj-alert-actions>
        <kj-button kjSize="sm" (click)="retry()">Retry</kj-button>
      </kj-alert-actions>
    </kj-alert>

    @if (show()) {
      <kj-alert kjVariant="warning" (kjAlertDismissed)="show.set(false)">
        <kj-alert-icon>!</kj-alert-icon>
        <kj-alert-description>Storage is 92% full.</kj-alert-description>
        <kj-alert-dismiss />
      </kj-alert>
    }
  `,
})
export class KjAlertUsageExample {
  readonly show = signal(true);
  retry(): void { /* re-fetch */ }
}
