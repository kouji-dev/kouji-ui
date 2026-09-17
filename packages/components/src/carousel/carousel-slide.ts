import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { KjCarouselSlide } from '@kouji-ui/core';

/**
 * Styled wrapper around `KjCarouselSlide`. Project a single slide; the
 * directive's `aria-label="N of M[: label]"` is computed from its index in
 * registration order plus the optional `[label]` shorthand.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-slide',
  standalone: true,
  hostDirectives: [
    {
      directive: KjCarouselSlide,
      inputs: ['kjSlideValue: value', 'kjSlideLabel: label', 'kjSlideAlign: align'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-carousel-slide',
    '[attr.data-align]': 'effectiveAlign()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselSlideComponent {
  protected readonly slide = inject(KjCarouselSlide);
  protected readonly effectiveAlign = computed(() => this.slide.effectiveAlign());
}
