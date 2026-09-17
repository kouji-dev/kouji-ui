import { DestroyRef, Directive, booleanAttribute, effect, inject, input } from '@angular/core';
import { KJ_CAROUSEL, KjCarouselAutoplayRef } from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Autoplay directive — lifecycle-only, no DOM. Manages a `setInterval` that
 * advances the carousel when all five gates are open:
 *
 * 1. The directive is mounted (composition is the on switch).
 * 2. `prefers-reduced-motion: reduce` does not match.
 * 3. The user has not pressed pause (`carousel.paused()` is false).
 * 4. Pointer is not hovering the carousel root, or `kjPauseOnHover` is false.
 * 5. Focus is not within the carousel root, or `kjPauseOnFocus` is false.
 *
 * Per WCAG 2.2.2 a delay greater than 5000 ms requires a pause control to be
 * present in the same composition.
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselAutoplay]',
  standalone: true,
  exportAs: 'kjCarouselAutoplay',
})
export class KjCarouselAutoplay implements KjCarouselAutoplayRef {
  private readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselAutoplay', parent: '[kjCarousel]' });

  /** Interval between automatic advances. WCAG 2.2.2 requires a pause control when > 5000 ms. */
  readonly kjAutoplayDelay = input<number>(5000);

  /** Auto-pause while pointer is over the carousel root. */
  readonly kjPauseOnHover = input(true, { transform: booleanAttribute });

  /** Auto-pause while focus is within the carousel root. APG-required affordance for keyboard users. */
  readonly kjPauseOnFocus = input(true, { transform: booleanAttribute });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.carousel.registerAutoplay(this);
    inject(DestroyRef).onDestroy(() => {
      this.clearTimer();
      this.carousel.unregisterAutoplay(this);
    });

    effect(() => {
      const active = this.carousel.autoplayActive();
      const delay = this.kjAutoplayDelay();
      this.clearTimer();
      if (active && delay > 0) {
        this.timer = setInterval(() => {
          // Re-check gates inside the timer (may have flipped between fires).
          if (!this.carousel.autoplayActive()) return;
          // Auto-advance is silent — buildSlideAnnouncement is *not* called.
          this.carousel.next();
        }, delay);
      }
    });
  }

  private clearTimer(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
