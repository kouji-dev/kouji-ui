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
 * Tabbed carousel — `<kj-carousel-indicators controlPattern="tabs">` flips
 * the indicator group into a `role="tablist"` and the slides into
 * `role="tabpanel"`s; the dots become `role="tab"` with `aria-selected` on
 * the active one and `aria-controls` wired to the slide id. Arrow keys on a
 * focused tab activate (per APG tabs pattern).
 */
@Component({
  selector: 'kj-carousel-tabs-pattern-example',
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
    <kj-carousel label="Product overview">
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        <kj-carousel-slide value="overview" label="Overview"
          ><div class="slide">Overview</div></kj-carousel-slide
        >
        <kj-carousel-slide value="pricing" label="Pricing"
          ><div class="slide">Pricing</div></kj-carousel-slide
        >
        <kj-carousel-slide value="faq" label="FAQ"><div class="slide">FAQ</div></kj-carousel-slide>
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
      <kj-carousel-indicators controlPattern="tabs" ariaLabel="Sections" />
    </kj-carousel>
  `,
})
export class KjCarouselTabsPatternExample {}
