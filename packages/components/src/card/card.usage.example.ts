import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import {
  KjCardComponent,
  KjCardContentComponent,
  KjCardFooterComponent,
  KjCardHeaderComponent,
  KjCardSubtitleComponent,
  KjCardTitleComponent,
} from './card';

/**
 * Common card shape — header / subtitle / content / footer actions.
 * Use this as the copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-card-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjCardComponent,
    KjCardHeaderComponent,
    KjCardTitleComponent,
    KjCardSubtitleComponent,
    KjCardContentComponent,
    KjCardFooterComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: block; max-width: 32rem; }`],
  template: `
    <kj-card variant="default">
      <kj-card-header>
        <kj-card-title>Workspace settings</kj-card-title>
        <kj-card-subtitle>Manage members and integrations</kj-card-subtitle>
      </kj-card-header>
      <kj-card-content>
        <p>Invite teammates, rotate API keys, and configure SSO providers.</p>
      </kj-card-content>
      <kj-card-footer align="end">
        <kj-button kjVariant="ghost">Cancel</kj-button>
        <kj-button kjVariant="default">Save changes</kj-button>
      </kj-card-footer>
    </kj-card>
  `,
})
export class KjCardUsageExample {}
