import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  KjCarouselComponent,
  KjCarouselViewportComponent,
  KjCarouselSlideComponent,
  KjCarouselPreviousComponent,
  KjCarouselNextComponent,
  KjCarouselIndicatorsComponent,
} from '../carousel';

/**
 * Carousel with auto-projected dot indicators in `buttons` control mode —
 * `aria-current="true"` marks the active dot. Tab focuses the indicator
 * group as a single tab stop; arrow keys move between dots.
 */
@Component({
  selector: 'kj-carousel-indicators-example',
  standalone: true,
  imports: [
    KjCarouselComponent,
    KjCarouselViewportComponent,
    KjCarouselSlideComponent,
    KjCarouselPreviousComponent,
    KjCarouselNextComponent,
    KjCarouselIndicatorsComponent,
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
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-carousel label="Trip ideas">
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        <kj-carousel-slide value="city" label="City breaks"
          ><div class="slide">City breaks</div></kj-carousel-slide
        >
        <kj-carousel-slide value="beach" label="Beach weeks"
          ><div class="slide">Beach weeks</div></kj-carousel-slide
        >
        <kj-carousel-slide value="mountain" label="Mountain hikes"
          ><div class="slide">Mountain hikes</div></kj-carousel-slide
        >
        <kj-carousel-slide value="culture" label="Culture trails"
          ><div class="slide">Culture trails</div></kj-carousel-slide
        >
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
      <kj-carousel-indicators ariaLabel="Trip slide controls" />
    </kj-carousel>
  `,
})
export class KjCarouselIndicatorsExample {}
