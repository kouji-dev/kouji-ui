import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjButtonComponent } from '../../button/button';
import {
  KjAlertActionsComponent,
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertDismissComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
} from '../alert';

/**
 * Static page-top banner (`kjAlertStatic="true"`). Resolves to
 * `role="region"` with no `aria-live` — present on initial render, navigable
 * via the AT region rotor. The directive enforces an accessible name (here
 * via `aria-labelledby` to the title id, auto-wired by `KjAlertTitle`).
 */
@Component({
  selector: 'kj-alert-banner-example',
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
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (visible()) {
      <kj-alert [kjAlertStatic]="true" kjVariant="warning" (kjAlertDismissed)="visible.set(false)">
        <kj-alert-icon>!</kj-alert-icon>
        <kj-alert-title>Maintenance scheduled</kj-alert-title>
        <kj-alert-description>
          The platform will be unavailable on Saturday from 02:00 to 04:00 UTC.
        </kj-alert-description>
        <kj-alert-actions>
          <kj-button kjVariant="link" kjSize="sm">Status page</kj-button>
        </kj-alert-actions>
        <kj-alert-dismiss />
      </kj-alert>
    }
  `,
})
export class KjAlertBannerExample {
  readonly visible = signal(true);
}
