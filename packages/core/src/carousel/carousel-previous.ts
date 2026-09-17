import { Directive, computed } from '@angular/core';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { KJ_CAROUSEL } from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Previous-slide control. Composes `KjFocusRing` and `KjDisabled`; when the
 * carousel is not looping and the current slide is the first, the host
 * receives `aria-disabled="true"` and click is a no-op.
 *
 * Apply to a real `<button>` so Enter / Space, focus, and disabled semantics
 * work without extra wiring.
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselPrevious]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.aria-controls]': 'carousel.viewportId()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class KjCarouselPrevious {
  /** @internal */
  readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselPrevious', parent: '[kjCarousel]' });

  /** Whether the button is currently at the boundary (and not looping). */
  readonly disabled = computed(() => this.carousel.atStart());

  /** @internal */
  onClick(): void {
    if (this.disabled()) return;
    const previousValue = this.carousel.currentValue();
    this.carousel.prev();
    const next = this.carousel.currentValue();
    if (next != null && next !== previousValue) {
      const msg = this.carousel.buildSlideAnnouncement(next);
      if (msg) this.carousel.announce(msg);
    }
  }
}
