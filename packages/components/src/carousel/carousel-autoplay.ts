import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { KjCarouselAutoplay } from '@kouji-ui/core';

/**
 * Styled wrapper around `KjCarouselAutoplay`. Lifecycle-only directive — has
 * no visible DOM. Drop next to the carousel content to attach the autoplay
 * behaviour; pair with `<kj-carousel-pause>` whenever the delay exceeds
 * 5000 ms (WCAG 2.2.2).
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-autoplay',
  standalone: true,
  hostDirectives: [
    {
      directive: KjCarouselAutoplay,
      inputs: [
        'kjAutoplayDelay: delay',
        'kjPauseOnHover: pauseOnHover',
        'kjPauseOnFocus: pauseOnFocus',
      ],
    },
  ],
  template: ``,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: none;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselAutoplayComponent {}
