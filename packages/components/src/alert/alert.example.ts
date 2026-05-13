import { Component } from '@angular/core';
import {
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
} from './alert';

/**
 * Default usage example for `KjAlertComponent`. Polite info alert with icon,
 * title, and description. Resolves to `role="status"` + `aria-live="polite"`.
 */
@Component({
  selector: 'kj-alert-example',
  standalone: true,
  imports: [
    KjAlertComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <kj-alert kjVariant="info">
      <kj-alert-icon>i</kj-alert-icon>
      <kj-alert-title>Heads up</kj-alert-title>
      <kj-alert-description>
        New theme tokens just landed — try the dark variant in your settings.
      </kj-alert-description>
    </kj-alert>
  `,
})
export class KjAlertExample {}
