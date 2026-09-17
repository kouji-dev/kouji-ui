import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { KjCarouselPrevious, KjTranslateService } from '@kouji-ui/core';

/**
 * Styled wrapper around `KjCarouselPrevious`. Renders a real `<button>` so
 * Enter / Space activation, focus, and disabled semantics work for free.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name carousel
 */
@Component({
  selector: 'kj-carousel-previous',
  standalone: true,
  imports: [KjCarouselPrevious],
  template: `
    <button
      type="button"
      kjCarouselPrevious
      class="kj-carousel-control kj-carousel-previous"
      [attr.aria-label]="label()"
    >
      <ng-content>‹</ng-content>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCarouselPreviousComponent {
  private readonly i18n = inject(KjTranslateService);

  /**
   * Accessible name for the control (WCAG 4.1.2). Leave it unset and the name
   * comes from the i18n catalog key `carousel.previous`, so registering a
   * catalog translates it — cust F-7. Setting it wins for this one control.
   */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });

  /** Resolved accessible name: the `aria-label` input, else the catalog. */
  protected readonly label = computed(
    () => this.ariaLabel() ?? this.i18n.translate('carousel.previous'),
  );
}
