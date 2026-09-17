import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KJ_CAROUSEL, KjCarouselViewportRef } from './carousel.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Carousel viewport — the scroll container that hosts the slides. Owns
 * `overflow: hidden` (or `auto` when draggable), the scroll-snap axis, and
 * the `IntersectionObserver` that detects which slide has settled into view.
 *
 * Place inside `KjCarousel`. The viewport is *not* a tab stop — the previous
 * / next buttons and indicator dots cover the keyboard advance paths, and a
 * focusable scroll container conflicts with screen-reader virtual-cursor
 * navigation through the projected slide content.
 *
 * @doc-category Core/Data display
 * @doc
 * @doc-name carousel
 */
@Directive({
  selector: '[kjCarouselViewport]',
  standalone: true,
  exportAs: 'kjCarouselViewport',
  host: {
    '[attr.id]': 'carousel.viewportId()',
    '[attr.data-orientation]': 'carousel.orientation()',
    '[style.--kj-carousel-slides-per-view]': 'slidesPerViewVar()',
    '(mouseenter)': 'carousel.setHovering(true)',
    '(mouseleave)': 'carousel.setHovering(false)',
    '(focusin)': 'carousel.setFocusWithin(true)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class KjCarouselViewport implements KjCarouselViewportRef {
  private readonly platformId = inject(PLATFORM_ID);
  /** @internal */
  readonly carousel = injectParent(KJ_CAROUSEL, { child: 'KjCarouselViewport', parent: '[kjCarousel]' });
  /** @internal Native host element. */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private observer: IntersectionObserver | null = null;

  /** @internal Computed style variable feed for the slide flex-basis. */
  protected slidesPerViewVar(): string {
    const v = this.carousel.kjSlidesPerView();
    return v === 'auto' ? 'auto' : String(v);
  }

  constructor() {
    // Register synchronously: slides construct after this directive and read
    // the viewport back off the root.
    this.carousel.registerViewport(this);

    // DOM observation waits for the first render (and never runs on the server).
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        this.observer = new IntersectionObserver(
          (entries) => this.onIntersect(entries),
          { root: this.el.nativeElement, threshold: [0.6] },
        );
        this.observeSlides();
      });
    }

    // Keep the observed set in step with the registered slides. The initial
    // `observeSlides()` above only ever saw the slides that existed at first
    // render, so a slide added later (an @if / @for over a growing list) never
    // updated `currentValue` when it scrolled into view.
    effect(() => {
      this.carousel.slides();
      untracked(() => this.observeSlides());
    });

    inject(DestroyRef).onDestroy(() => {
      // The settle timer outlives the observer otherwise, and its callback
      // writes `carousel.kjValue` on a destroyed component.
      if (this.settleTimer) clearTimeout(this.settleTimer);
      this.settleTimer = null;
      this.observer?.disconnect();
      this.observer = null;
      this.observed.clear();
      this.carousel.unregisterViewport(this);
    });
  }

  /** Slide elements currently handed to the observer. */
  private readonly observed = new Set<Element>();

  /**
   * @internal Observe every registered slide, and stop observing any that has
   * gone away. Idempotent — re-observing an element the observer already
   * watches is a no-op, so only the delta costs anything.
   */
  observeSlides(): void {
    const observer = this.observer;
    if (!observer) return;
    const current = new Set<Element>();
    for (const slide of this.carousel.slides()) {
      const el = slide.el.nativeElement;
      current.add(el);
      if (!this.observed.has(el)) {
        observer.observe(el);
        this.observed.add(el);
      }
    }
    for (const el of [...this.observed]) {
      if (current.has(el)) continue;
      observer.unobserve(el);
      this.observed.delete(el);
    }
  }

  /** @internal */
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.el.nativeElement.contains(next)) {
      // Inspect the carousel root via the viewport's parentage — the host is
      // somewhere up the tree. If focus left the viewport but stayed within
      // the broader carousel root, leave focusWithin true; otherwise clear.
      // Conservative behaviour: clear on viewport blur — gate 5 only matters
      // for autoplay, and any subsequent focusin will re-set it.
      this.carousel.setFocusWithin(false);
    }
  }

  private lastBest: { ratio: number; value: string } | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    // Pick the entry with the highest ratio that crossed the threshold.
    let best: { ratio: number; el: Element } | null = null;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!best || entry.intersectionRatio > best.ratio) {
        best = { ratio: entry.intersectionRatio, el: entry.target };
      }
    }
    if (!best) return;
    const slide = this.carousel.slides().find((s) => s.el.nativeElement === best!.el);
    if (!slide) return;
    const value = slide.kjSlideValue();
    if (this.carousel.currentValue() === value) return;

    // Debounce settle to avoid flicker when two slides cross 0.6 in the same frame.
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      // Only commit if this is still the best; in vertical-scroll cases the
      // browser may emit several entries before settling.
      const list = this.carousel.slides();
      if (!list.some((s) => s.kjSlideValue() === value)) return;
      const previous = this.carousel.currentValue();
      this.carousel.kjValue.set(value);
      // Announce only when the carousel is not currently auto-playing;
      // autoplay-driven advances are silent per APG to avoid AT flooding.
      if (previous !== null && previous !== value && !this.carousel.autoplayActive()) {
        const msg = this.carousel.buildSlideAnnouncement(value);
        if (msg) this.carousel.announce(msg);
      }
    }, 50);
  }
}
