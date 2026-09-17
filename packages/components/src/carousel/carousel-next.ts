import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { KjCarouselNext, KjIcon, KjTranslateService } from '@kouji-ui/core';

/**
 * Styled wrapper around `KjCarouselNext`. Symmetric counterpart of
 * `KjCarouselPreviousComponent`.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-next',
  standalone: true,
  imports: [KjCarouselNext, KjIcon],
  template: `
    <button
      type="button"
      kjCarouselNext
      class="kj-carousel-control kj-carousel-next"
      [attr.aria-label]="label()"
    >
      <ng-content><i kjIcon="chevron-right"></i></ng-content>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselNextComponent {
  private readonly i18n = inject(KjTranslateService);

  /**
   * Accessible name for the control (WCAG 4.1.2). Leave it unset and the name
   * comes from the i18n catalog key `carousel.next` — cust F-7.
   */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });

  /** Resolved accessible name: the `aria-label` input, else the catalog. */
  protected readonly label = computed(
    () => this.ariaLabel() ?? this.i18n.translate('carousel.next'),
  );
}
