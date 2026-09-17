import { DestroyRef, Directive, ElementRef, Signal, computed, inject, input } from '@angular/core';
import {
  KJ_CAROUSEL,
  KJ_CAROUSEL_SLIDE,
  KjCarouselAlign,
  KjCarouselSlideContext,
  KjCarouselSlideRef,
} from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Single slide. Hosts `role="group"` + `aria-roledescription="slide"` and
 * `aria-label="N of M[: <label>]"` (or `aria-labelledby` when a projected
 * heading id is supplied via the slide context). Switches to
 * `role="tabpanel"` when the parent indicator group is in
 * `controlPattern="tabs"` mode.
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselSlide]',
  standalone: true,
  exportAs: 'kjCarouselSlide',
  providers: [{ provide: KJ_CAROUSEL_SLIDE, useExisting: KjCarouselSlide }],
  host: {
    '[attr.id]': 'slideLabelId()',
    '[attr.role]': 'role()',
    '[attr.aria-roledescription]': 'role() === "group" ? "slide" : null',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-active]': 'isActive() ? "" : null',
    '[attr.data-index]': 'index()',
  },
})
export class KjCarouselSlide implements KjCarouselSlideContext, KjCarouselSlideRef {
  /** @internal */
  readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselSlide', parent: '[kjCarousel]' });
  /** @internal Native host element. */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Required string identifier for this slide. */
  readonly kjSlideValue = input.required<string>();

  /** Optional accessible name appended to `"N of M"` to form the slide's `aria-label`. */
  readonly kjSlideLabel = input<string | undefined>(undefined);

  /** Per-slide alignment override; defaults to the carousel's `kjAlign`. */
  readonly kjSlideAlign = input<KjCarouselAlign | undefined>(undefined);

  /** Read-only mirror of the slide value. */
  readonly value: Signal<string> = this.kjSlideValue;

  /**
   * Index of this slide in registration order.
   *
   * Explicitly annotated: `slides()` is typed as `KjCarouselSlideRef[]`,
   * whose `index` is this signal, so inference would be circular.
   */
  readonly index: Signal<number> = computed(() =>
    this.carousel.slides().findIndex((s) => s === this),
  );

  /** Whether this slide is the currently active one. */
  readonly isActive: Signal<boolean> = computed(() =>
    this.carousel.isActive(this.kjSlideValue()),
  );

  /** Stable id for the slide host element — sourced from the parent carousel so indicator `aria-controls` stays in sync. */
  readonly slideLabelId: Signal<string> = computed(() =>
    this.carousel.slideId(this.kjSlideValue()),
  );

  /** Effective alignment — per-slide override beats carousel-level default. */
  readonly effectiveAlign = computed<KjCarouselAlign>(
    () => this.kjSlideAlign() ?? this.carousel.kjAlign(),
  );

  /** @internal Computed role — `'tabpanel'` when an indicators group in `controlPattern="tabs"` is registered, `'group'` otherwise. */
  protected role(): string {
    return this.carousel.controlPattern() === 'tabs' ? 'tabpanel' : 'group';
  }

  /** @internal Computed aria-label — `"N of M[: <label>]"` when in group mode. */
  protected ariaLabel(): string | null {
    if (this.role() !== 'group') return null;
    const total = this.carousel.slideCount();
    const idx = this.index();
    if (idx < 0) return null;
    const base = `${idx + 1} of ${total}`;
    const label = this.kjSlideLabel();
    return label ? `${base}: ${label}` : base;
  }

  constructor() {
    // Registration order is DOM order — the slide index, the `N of M` label
    // and the indicator mapping all read it back.
    this.carousel.registerSlide(this);
    inject(DestroyRef).onDestroy(() => this.carousel.unregisterSlide(this));
  }
}
