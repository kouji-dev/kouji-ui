import { Component } from '@angular/core';
import { KjCardComponent, KjCardHeaderComponent, KjCardTitleComponent, KjCardSubtitleComponent, KjCardContentComponent, KjCardFooterComponent } from './card';
import { KjButtonComponent } from '../button/button';

@Component({
  selector: 'kj-card-full-example',
  standalone: true,
  imports: [KjCardComponent, KjCardHeaderComponent, KjCardTitleComponent, KjCardSubtitleComponent, KjCardContentComponent, KjCardFooterComponent, KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <kj-card style="max-width: 24rem;">
      <kj-card-header>
        <kj-card-title>Project Atlas</kj-card-title>
        <kj-card-subtitle>Status: in progress</kj-card-subtitle>
      </kj-card-header>
      <kj-card-content>
        <p>Atlas is the planning tool used by the platform team. It supports drafts, comments, and shared boards.</p>
      </kj-card-content>
      <kj-card-footer>
        <kj-button kjVariant="ghost">Dismiss</kj-button>
        <kj-button>Open</kj-button>
      </kj-card-footer>
    </kj-card>
  `,
})
export class KjCardFullExample {}
