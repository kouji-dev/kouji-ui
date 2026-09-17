import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChildren,
  inject,
} from '@angular/core';
import {
  KJ_CAROUSEL,
  KjCarouselIndicator,
  KjCarouselIndicators,
  KjTranslateService,
} from '@kouji-ui/core';
import type { KjCarouselContext } from '@kouji-ui/core';

/**
 * Styled wrapper around `KjCarouselIndicators`. Auto-projects one
 * `<button kjCarouselIndicator>` per registered slide (dot list) when no
 * `<kj-carousel-indicator>` children are projected, otherwise leaves the
 * projected children alone — letting consumers swap dots for thumbnails or
 * numbered chips.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-indicators',
  standalone: true,
  imports: [KjCarouselIndicator],
  hostDirectives: [
    {
      directive: KjCarouselIndicators,
      inputs: ['kjControlPattern: controlPattern', 'kjAriaLabel: ariaLabel'],
    },
  ],
  template: `
    <ng-content />
    @if (autoProject()) {
      @for (slide of carousel.slides(); track slide.kjSlideValue()) {
        <button
          type="button"
          kjCarouselIndicator
          class="kj-carousel-indicator"
          [kjForValue]="slide.kjSlideValue()"
          [attr.aria-label]="slideLabel($index + 1)"
          [attr.data-kj-indicator-value]="slide.kjSlideValue()"
        ></button>
      }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-carousel-indicators' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselIndicatorsComponent {
  protected readonly carousel = inject<KjCarouselContext>(KJ_CAROUSEL);
  private readonly i18n = inject(KjTranslateService);
  private readonly projectedIndicators = contentChildren(KjCarouselIndicator);

  /** Whether to render the auto-projected dot list (true when no indicator is projected). */
  protected readonly autoProject = computed(() => this.projectedIndicators().length === 0);

  /**
   * Accessible name for an auto-projected dot, from the i18n catalog key
   * `carousel.slide` (`"Slide {index}"`) — cust F-7: the number is
   * interpolated by the catalog, so a locale can put it wherever it belongs.
   */
  protected slideLabel(index: number): string {
    return this.i18n.translate('carousel.slide', { index });
  }
}
