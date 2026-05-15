import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjCarouselComponent,
  KjCarouselIndicatorsComponent,
  KjCarouselNextComponent,
  KjCarouselPreviousComponent,
  KjCarouselSlideComponent,
  KjCarouselViewportComponent,
} from './carousel';

/**
 * Common carousel shape — bound active slide, prev / next controls, and a
 * dot indicator row. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-carousel-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjCarouselComponent,
    KjCarouselViewportComponent,
    KjCarouselSlideComponent,
    KjCarouselPreviousComponent,
    KjCarouselNextComponent,
    KjCarouselIndicatorsComponent,
  ],
  styles: [`
    :host { display: block; }
    .slide { display: grid; place-items: center; min-height: 10rem; font-weight: 600; }
  `],
  template: `
    <kj-carousel [(value)]="active" label="Featured posts">
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        <kj-carousel-slide value="a" label="Token system"><div class="slide">Token system</div></kj-carousel-slide>
        <kj-carousel-slide value="b" label="Theming"><div class="slide">Theming</div></kj-carousel-slide>
        <kj-carousel-slide value="c" label="A11y first"><div class="slide">A11y first</div></kj-carousel-slide>
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
      <kj-carousel-indicators />
    </kj-carousel>
  `,
})
export class KjCarouselUsageExample {
  readonly active = signal('a');
}
