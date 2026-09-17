import { Directive, ElementRef, computed, effect, inject, input } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { KJ_ROVING_TABINDEX, KjRovingTabindexItem } from '../a11y/roving-tabindex';
import {
  KJ_CAROUSEL,
  KJ_CAROUSEL_INDICATORS,
} from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Single indicator dot. Composes `KjRovingTabindexItem` and `KjFocusRing`,
 * targets the slide whose value matches `kjForValue` on click, and reflects
 * the active state via `aria-current` (buttons mode) or `aria-selected`
 * (tabs mode). The active dot is the indicator group's tab stop.
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselIndicator]',
  standalone: true,
  hostDirectives: [KjRovingTabindexItem, KjFocusRing],
  host: {
    '[attr.role]': 'indicators.controlPattern() === "tabs" ? "tab" : null',
    '[attr.aria-current]': 'indicators.controlPattern() === "buttons" && isActive() ? "true" : null',
    '[attr.aria-selected]': 'indicators.controlPattern() === "tabs" ? (isActive() ? "true" : "false") : null',
    '[attr.aria-controls]': 'indicators.controlPattern() === "tabs" ? carousel.slideId(kjForValue()) : null',
    '[attr.data-active]': 'isActive() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjCarouselIndicator {
  /** @internal */
  readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselIndicator', parent: '[kjCarousel]' });
  /** @internal */
  readonly indicators = injectParent(KJ_CAROUSEL_INDICATORS, { child: 'KjCarouselIndicator', parent: '[kjCarouselIndicators]' });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly roving = inject(KJ_ROVING_TABINDEX, { optional: true });

  /** Slide value this indicator targets. */
  readonly kjForValue = input.required<string>();

  /** Whether this indicator's slide is the active one. */
  readonly isActive = computed(() => this.carousel.isActive(this.kjForValue()));

  constructor() {
    // The indicator group's single tab stop is the active slide's dot.
    effect(() => {
      if (this.isActive()) this.roving?.setActive(this.el.nativeElement);
    });
  }

  /** @internal */
  onClick(): void {
    const previousValue = this.carousel.currentValue();
    this.indicators.activate(this.kjForValue());
    const next = this.carousel.currentValue();
    if (next != null && next !== previousValue) {
      const msg = this.carousel.buildSlideAnnouncement(next);
      if (msg) this.carousel.announce(msg);
    }
  }

  /**
   * @internal Tabs-mode keyboard contract: ArrowLeft/Right (or Up/Down in
   * vertical orientation) advance focus *and* activate, per APG tabs. In
   * buttons mode, the composed `KjRovingTabindex` already handles arrow
   * focus; activation requires Enter / Space, which the native `<button>`
   * resolves on its own.
   */
  onKeydown(event: KeyboardEvent): void {
    if (this.indicators.controlPattern() !== 'tabs') return;
    // Roving tabindex moves focus on next tick; piggy-back on the
    // focus event by activating the matching slide via the new active item.
    // We don't preventDefault — KjRovingTabindex needs to consume the arrow.
    if (
      event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' || event.key === 'ArrowDown'
    ) {
      // Defer so the new active item has been focused.
      queueMicrotask(() => {
        const focused = this.document.activeElement as
          | HTMLElement
          | null;
        if (!focused) return;
        const value = focused.getAttribute('data-kj-indicator-value');
        if (value) this.carousel.goTo(value);
      });
    }
  }
}
