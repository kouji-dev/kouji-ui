import { Directive } from '@angular/core';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { KJ_CAROUSEL } from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Pause / play toggle. Wraps a real `<button>` and reflects the carousel's
 * `paused` signal as `aria-pressed`. When `prefers-reduced-motion: reduce`
 * matches the host is auto-disabled (autoplay never starts, so the toggle is
 * meaningless).
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselPauseToggle]',
  standalone: true,
  hostDirectives: [KjFocusRing, KjDisabled],
  host: {
    '[attr.aria-pressed]': 'carousel.paused() ? "true" : "false"',
    '[attr.data-paused]': 'carousel.paused() ? "" : null',
    '[attr.disabled]': 'carousel.prefersReducedMotion() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class KjCarouselPauseToggle {
  /** @internal */
  readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselPauseToggle', parent: '[kjCarousel]' });

  /** @internal */
  onClick(): void {
    if (this.carousel.prefersReducedMotion()) return;
    if (this.carousel.paused()) this.carousel.play();
    else this.carousel.pause();
  }
}
