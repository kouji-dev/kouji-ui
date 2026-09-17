import { DestroyRef, Directive, Signal, inject, input } from '@angular/core';
import { KjRovingTabindex } from '../a11y/roving-tabindex';
import {
  KJ_CAROUSEL,
  KJ_CAROUSEL_INDICATORS,
  KjCarouselControlPattern,
  KjCarouselIndicatorsContext,
} from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Indicator-group container. Hosts `role="group"` (default) or
 * `role="tablist"` (`controlPattern="tabs"`), composes `KjRovingTabindex`
 * for arrow-key navigation across the dots, and exposes
 * `KJ_CAROUSEL_INDICATORS` to descendants so individual indicator items can
 * read the active control pattern.
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselIndicators]',
  standalone: true,
  hostDirectives: [KjRovingTabindex],
  providers: [{ provide: KJ_CAROUSEL_INDICATORS, useExisting: KjCarouselIndicators }],
  host: {
    '[attr.role]': 'kjControlPattern() === "tabs" ? "tablist" : "group"',
    '[attr.aria-label]': 'kjAriaLabel()',
    '[attr.aria-orientation]': 'carousel.orientation()',
    '[attr.data-control-pattern]': 'kjControlPattern()',
  },
})
export class KjCarouselIndicators implements KjCarouselIndicatorsContext {
  /** @internal */
  readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselIndicators', parent: '[kjCarousel]' });

  /** Active control pattern. `'buttons'` is the APG-recommended default; `'tabs'` opts into the tablist variant. */
  readonly kjControlPattern = input<KjCarouselControlPattern>('buttons');

  /** Accessible name for the indicator group. */
  readonly kjAriaLabel = input<string>('Slide controls');

  /** Read-only mirror of the control pattern for the per-indicator host bindings. */
  readonly controlPattern: Signal<KjCarouselControlPattern> = this.kjControlPattern;

  constructor() {
    this.carousel.registerIndicators(this);
    inject(DestroyRef).onDestroy(() => this.carousel.unregisterIndicators(this));
  }

  /** Activate the slide for `value`. */
  activate(value: string): void {
    this.carousel.goTo(value);
  }
}
