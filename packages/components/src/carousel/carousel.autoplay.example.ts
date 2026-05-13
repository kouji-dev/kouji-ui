import { Component } from '@angular/core';
import {
  KjCarouselComponent,
  KjCarouselViewportComponent,
  KjCarouselSlideComponent,
  KjCarouselPreviousComponent,
  KjCarouselNextComponent,
  KjCarouselIndicatorsComponent,
  KjCarouselAutoplayComponent,
  KjCarouselPauseComponent,
} from './carousel';

/**
 * Autoplay with the WCAG 2.2.2-required pause control. Delay is set to 6000 ms
 * (over the 5-second threshold), so the pause button is mandatory. Hover and
 * focus auto-pause are on by default; under
 * `prefers-reduced-motion: reduce` autoplay never starts and the pause button
 * is rendered disabled.
 */
@Component({
  selector: 'kj-carousel-autoplay-example',
  standalone: true,
  imports: [
    KjCarouselComponent,
    KjCarouselViewportComponent,
    KjCarouselSlideComponent,
    KjCarouselPreviousComponent,
    KjCarouselNextComponent,
    KjCarouselIndicatorsComponent,
    KjCarouselAutoplayComponent,
    KjCarouselPauseComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .slide { display: grid; place-items: center; min-height: 12rem; font-weight: 600; font-size: 1.125rem; }
  `],
  template: `
    <kj-carousel label="Latest news">
      <kj-carousel-autoplay [delay]="6000" />
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        <kj-carousel-slide value="release" label="0.1 release"><div class="slide">0.1 release</div></kj-carousel-slide>
        <kj-carousel-slide value="roadmap" label="Roadmap update"><div class="slide">Roadmap update</div></kj-carousel-slide>
        <kj-carousel-slide value="hiring"  label="We are hiring"><div class="slide">We are hiring</div></kj-carousel-slide>
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
      <kj-carousel-indicators />
      <kj-carousel-pause aria-label="Pause carousel" />
    </kj-carousel>
  `,
})
export class KjCarouselAutoplayExample {}
