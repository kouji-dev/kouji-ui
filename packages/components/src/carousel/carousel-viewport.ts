import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { KjCarouselViewport } from '@kouji-ui/core';

/**
 * Styled wrapper around `KjCarouselViewport`. Hosts the scroll container that
 * the slides scroll-snap into, and forwards through to the underlying
 * directive (no public inputs).
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-viewport',
  standalone: true,
  hostDirectives: [KjCarouselViewport],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-carousel-viewport' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselViewportComponent {}
