import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  KjBadgeComponent,
  KjButtonComponent,
  KjCardComponent,
  KjCardContentComponent,
  KjCardSubtitleComponent,
  KjCardTitleComponent,
} from '@kouji-ui/components';

interface FeatureCard {
  readonly title: string;
  readonly description: string;
}

const FEATURES: readonly FeatureCard[] = [
  { title: '47 components', description: 'buttons, forms, overlays — the basics, polished.' },
  { title: '13 themes',     description: 'or fork one and make your own. tokens cascade.' },
  { title: '12kb gzipped',  description: 'tree-shakable, no peer-dep gymnastics.' },
];

/**
 * Preview scene 01 — Landing: hero + cta + feature cards.
 *
 * Mirrors the React reference's SceneLanding. A one-screen marketing pitch
 * exercising display type, primary/ghost CTAs, and a card grid.
 */
@Component({
  selector: 'kj-preview-landing',
  standalone: true,
  imports: [
    KjBadgeComponent,
    KjButtonComponent,
    KjCardComponent,
    KjCardContentComponent,
    KjCardSubtitleComponent,
    KjCardTitleComponent,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewLanding {
  protected readonly features = FEATURES;
}
