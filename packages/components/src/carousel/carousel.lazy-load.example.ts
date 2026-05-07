import { Component } from '@angular/core';
import {
  KjCarouselComponent,
  KjCarouselViewportComponent,
  KjCarouselSlideComponent,
  KjCarouselPreviousComponent,
  KjCarouselNextComponent,
  KjCarouselIndicatorsComponent,
} from './carousel';

/**
 * Carousel of images with native `loading="lazy"` for each non-current slide.
 * The first slide loads eagerly so the initial paint sees a real image; the
 * rest defer until they enter the viewport, keeping the initial payload small
 * for hero rotators with many slides.
 */
@Component({
  selector: 'kj-carousel-lazy-load-example',
  standalone: true,
  imports: [
    KjCarouselComponent,
    KjCarouselViewportComponent,
    KjCarouselSlideComponent,
    KjCarouselPreviousComponent,
    KjCarouselNextComponent,
    KjCarouselIndicatorsComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    img { width: 100%; height: 16rem; object-fit: cover; border-radius: var(--kj-radius-box); }
  `],
  template: `
    <kj-carousel label="Image gallery">
      <kj-carousel-previous aria-label="Previous slide" />
      <kj-carousel-viewport>
        @for (item of items; track item.id; let first = $first) {
          <kj-carousel-slide [value]="item.id" [label]="item.alt">
            <img
              [src]="item.src"
              [alt]="item.alt"
              [attr.loading]="first ? 'eager' : 'lazy'"
              decoding="async"
            />
          </kj-carousel-slide>
        }
      </kj-carousel-viewport>
      <kj-carousel-next aria-label="Next slide" />
      <kj-carousel-indicators />
    </kj-carousel>
  `,
})
export class KjCarouselLazyLoadExample {
  readonly items = [
    { id: 'meadow',   src: 'https://placehold.co/800x400/png?text=Meadow',   alt: 'Mountain meadow at dusk' },
    { id: 'lake',     src: 'https://placehold.co/800x400/png?text=Lake',     alt: 'Alpine lake under cloud' },
    { id: 'glacier',  src: 'https://placehold.co/800x400/png?text=Glacier',  alt: 'Glacier ridge at dawn' },
    { id: 'forest',   src: 'https://placehold.co/800x400/png?text=Forest',   alt: 'Pine forest in winter' },
  ];
}
