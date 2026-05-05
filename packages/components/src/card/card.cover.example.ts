import { Component } from '@angular/core';
import { KjCardComponent, KjCardCoverComponent, KjCardHeaderComponent, KjCardTitleComponent, KjCardSubtitleComponent, KjCardContentComponent, KjCardFooterComponent } from './card';
import { KjButtonComponent } from '../button/button';

@Component({
  selector: 'kj-card-cover-example',
  standalone: true,
  imports: [KjCardComponent, KjCardCoverComponent, KjCardHeaderComponent, KjCardTitleComponent, KjCardSubtitleComponent, KjCardContentComponent, KjCardFooterComponent, KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-card style="max-width: 24rem;">
      <kj-card-cover fit="contain">
        <img src="https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?w=480&fit=crop" alt="Mountains" />
      </kj-card-cover>
      <kj-card-header>
        <kj-card-title>Mountain trip</kj-card-title>
        <kj-card-subtitle>March 2024</kj-card-subtitle>
      </kj-card-header>
      <kj-card-content>Three days in the alps with the team.</kj-card-content>
      <kj-card-footer>
        <kj-button>View</kj-button>
      </kj-card-footer>
    </kj-card>
  `,
})
export class KjCardCoverExample {}
