import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { KJ_CAROUSEL, KjCarouselPauseToggle, KjTranslateService } from '@kouji-ui/core';
import type { KjCarouselContext } from '@kouji-ui/core';

/**
 * Styled wrapper around `KjCarouselPauseToggle`. Renders a real `<button>`
 * with `aria-pressed` reflecting the carousel's `paused` signal. Required
 * whenever an autoplay directive is present and its delay > 5000 ms.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-pause',
  standalone: true,
  imports: [KjCarouselPauseToggle],
  template: `
    <button
      type="button"
      kjCarouselPauseToggle
      class="kj-carousel-pause"
      [attr.aria-label]="label()"
    >
      <ng-content>{{ paused() ? '▶' : '❚❚' }}</ng-content>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselPause {
  protected readonly carousel = inject<KjCarouselContext>(KJ_CAROUSEL);
  private readonly i18n = inject(KjTranslateService);

  /**
   * Accessible name for the toggle (WCAG 4.1.2). Leave it unset and the name
   * comes from the i18n catalog key `carousel.pause` — cust F-7.
   */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });

  /** Resolved accessible name: the `aria-label` input, else the catalog. */
  protected readonly label = computed(
    () => this.ariaLabel() ?? this.i18n.translate('carousel.pause'),
  );

  protected readonly paused = computed(() => this.carousel.paused());
}
