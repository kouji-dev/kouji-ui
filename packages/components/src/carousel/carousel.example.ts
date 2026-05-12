import { Component } from '@angular/core';
import {
  KjCarouselComponent,
  KjCarouselViewportComponent,
  KjCarouselSlideComponent,
  KjCarouselPreviousComponent,
  KjCarouselNextComponent,
} from './carousel';

/**
 * Default carousel example — four slides, manual previous / next controls,
 * no autoplay. Anchors the simplest correct usage and the API for screenshots.
 */
@Component({
  selector: 'kj-carousel-example',
  standalone: true,
  imports: [
    KjCarouselComponent,
    KjCarouselViewportComponent,
    KjCarouselSlideComponent,
    KjCarouselPreviousComponent,
    KjCarouselNextComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }
      .slide {
        display: grid;
        place-items: center;
        min-height: 12rem;
        font-weight: 600;
        font-size: 1.125rem;
      }
    `,
  ],
  template: `
    <kj-carousel label="Featured destinations">
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        <kj-carousel-slide value="alps" label="The Alps">
          <div class="slide">The Alps</div>
        </kj-carousel-slide>
        <kj-carousel-slide value="andes" label="The Andes">
          <div class="slide">The Andes</div>
        </kj-carousel-slide>
        <kj-carousel-slide value="atlas" label="The Atlas">
          <div class="slide">The Atlas</div>
        </kj-carousel-slide>
        <kj-carousel-slide value="dolomites" label="The Dolomites">
          <div class="slide">The Dolomites</div>
        </kj-carousel-slide>
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
    </kj-carousel>
  `,
})
export class KjCarouselExample {}
