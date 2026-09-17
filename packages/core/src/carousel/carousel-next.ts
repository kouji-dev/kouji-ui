import { Directive, computed } from '@angular/core';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { KJ_CAROUSEL } from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Next-slide control. Symmetric counterpart of `KjCarouselPrevious`.
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselNext]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.aria-controls]': 'carousel.viewportId()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class KjCarouselNext {
  /** @internal */
  readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselNext', parent: '[kjCarousel]' });

  /** Whether the button is currently at the boundary (and not looping). */
  readonly disabled = computed(() => this.carousel.atEnd());

  /** @internal */
  onClick(): void {
    if (this.disabled()) return;
    const previousValue = this.carousel.currentValue();
    this.carousel.next();
    const next = this.carousel.currentValue();
    if (next != null && next !== previousValue) {
      const msg = this.carousel.buildSlideAnnouncement(next);
      if (msg) this.carousel.announce(msg);
    }
  }
}
