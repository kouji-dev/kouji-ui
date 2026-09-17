import { ElementRef, InjectionToken, Signal, WritableSignal } from '@angular/core';

/** Carousel orientation. Drives `aria-orientation`, the scroll-snap axis, and the keyboard arrow mapping. */
export type KjCarouselOrientation = 'horizontal' | 'vertical';

/** Slide alignment within the viewport. Drives `scroll-snap-align`. */
export type KjCarouselAlign = 'start' | 'center' | 'end';

/** Indicator control pattern per WAI-ARIA APG. */
export type KjCarouselControlPattern = 'buttons' | 'tabs';

/**
 * Context exposed by the root `KjCarousel` directive to its descendants.
 * Centralises selection, orientation, loop state, autoplay gating and the
 * imperative `next` / `prev` / `goTo` / `play` / `pause` API.
 */
export interface KjCarouselContext {
  /** Currently active slide value, or null when no slide has settled yet. */
  readonly currentValue: Signal<string | null>;
  /** Currently active slide index, or -1 when no slide has settled yet. */
  readonly currentIndex: Signal<number>;
  /** Total number of registered slides (excluding loop clones). */
  readonly slideCount: Signal<number>;
  /** Carousel orientation. */
  readonly orientation: Signal<KjCarouselOrientation>;
  /** Whether wrap-around (loop) is enabled. */
  readonly loop: Signal<boolean>;
  /** True only when the user has explicitly paused autoplay (gate 3). */
  readonly paused: Signal<boolean>;
  /** True when an autoplay directive is registered and all five gates are open. */
  readonly autoplayActive: Signal<boolean>;
  /** Stable id of the viewport element — used by Previous / Next as `aria-controls` target. */
  viewportId(): string;
  /** Stable id for the slide identified by `value`. */
  slideId(value: string): string;
  /** Whether the slide for `value` is the active one. */
  isActive(value: string): boolean;
  /** Imperative: advance to the next slide (no-op at end when `kjLoop` is false). */
  next(): void;
  /** Imperative: advance to the previous slide (no-op at start when `kjLoop` is false). */
  prev(): void;
  /** Imperative: jump to a slide by value. */
  goTo(value: string): void;
  /** Imperative: explicitly pause autoplay (sets paused signal to true). */
  pause(): void;
  /** Imperative: explicitly resume autoplay (sets paused signal to false). */
  play(): void;
  /** Push a polite announcement to the live region (user-initiated changes only). */
  announce(message: string): void;

  // ── Internal composition surface ──────────────────────────────────────
  //
  // arch F-14: every child directive used to reach these by casting
  // `inject(KJ_CAROUSEL) as KjCarousel`, which defeats the interface boundary
  // the context pattern exists to create — the cast compiles against whatever
  // the class happens to expose, so nothing tells you when a child starts
  // depending on a private. They are part of the contract, marked `@internal`
  // because a consumer composing the published directives never calls them.

  /** @internal Two-way active-slide value. The viewport writes it on settle. */
  readonly kjValue: WritableSignal<string | null>;
  /** @internal Registered slides, in DOM order. */
  readonly slides: Signal<readonly KjCarouselSlideRef[]>;
  /** @internal Default slide alignment; a slide's own `kjSlideAlign` wins. */
  readonly kjAlign: Signal<KjCarouselAlign>;
  /** @internal Slides visible at once; feeds the viewport's flex-basis variable. */
  readonly kjSlidesPerView: Signal<number | 'auto'>;
  /** @internal Active control pattern, or `'buttons'` when no indicators are mounted. */
  readonly controlPattern: Signal<KjCarouselControlPattern>;

  /** @internal */ registerSlide(slide: KjCarouselSlideRef): void;
  /** @internal */ unregisterSlide(slide: KjCarouselSlideRef): void;
  /** @internal */ registerViewport(viewport: KjCarouselViewportRef): void;
  /** @internal */ unregisterViewport(viewport: KjCarouselViewportRef): void;
  /** @internal */ registerAutoplay(autoplay: KjCarouselAutoplayRef): void;
  /** @internal */ unregisterAutoplay(autoplay: KjCarouselAutoplayRef): void;
  /** @internal */ registerIndicators(indicators: KjCarouselIndicatorsContext): void;
  /** @internal */ unregisterIndicators(indicators: KjCarouselIndicatorsContext): void;
  /** @internal Registered by the styled wrapper, which owns the live region element. */
  registerLiveRegion(region: { announce: (message: string) => void } | null): void;

  /** @internal Viewport hover state — gate 4 of autoplay. */
  setHovering(hovering: boolean): void;
  /** @internal Viewport focus-within state — gate 5 of autoplay. */
  setFocusWithin(focusWithin: boolean): void;

  /** @internal At the first slide and not looping — the Previous button's disabled state. */
  atStart(): boolean;
  /** @internal At the last slide and not looping — the Next button's disabled state. */
  atEnd(): boolean;
  /** @internal `"Slide 3 of 7: <label>"`, or `null` when `value` is not registered. */
  buildSlideAnnouncement(value: string): string | null;
  /** @internal Whether `prefers-reduced-motion: reduce` is in force. */
  prefersReducedMotion(): boolean;
}

/**
 * What the root needs from a registered slide, and what the styled wrapper
 * reads back off `slides()`.
 *
 * Declared structurally rather than as `KjCarouselSlide` so this file stays
 * free of directive imports — the root can be typed against it without a
 * cycle, and a child no longer has to cast `inject(KJ_CAROUSEL)` back to the
 * concrete class to reach the registration API (arch F-14).
 */
export interface KjCarouselSlideRef extends KjCarouselSlideContext {
  /** The slide's host element — the scroll target and the observed node. */
  readonly el: ElementRef<HTMLElement>;
  /** The slide's identifier input. */
  readonly kjSlideValue: Signal<string>;
  /** Optional accessible name appended to `"N of M"`. */
  readonly kjSlideLabel: Signal<string | undefined>;
}

/** What the root needs from the viewport it scrolls. See {@link KjCarouselSlideRef}. */
export interface KjCarouselViewportRef {
  /** The scroll container's host element. */
  readonly el: ElementRef<HTMLElement>;
  /** Re-sync the IntersectionObserver with the registered slide set. */
  observeSlides(): void;
}

/** What the root's autoplay gating reads off a registered autoplay directive. */
export interface KjCarouselAutoplayRef {
  /** Auto-pause while the pointer is over the carousel root. */
  readonly kjPauseOnHover: Signal<boolean>;
  /** Auto-pause while focus is within the carousel root. */
  readonly kjPauseOnFocus: Signal<boolean>;
}

/** Per-slide context exposed to projected helpers. */
export interface KjCarouselSlideContext {
  /** Stable string identifier for this slide. */
  readonly value: Signal<string>;
  /** Index in registration order. */
  readonly index: Signal<number>;
  /** Whether this slide is the active one. */
  readonly isActive: Signal<boolean>;
  /** Stable id for the slide host element. */
  readonly slideLabelId: Signal<string>;
}

/** Indicator-group context. */
export interface KjCarouselIndicatorsContext {
  /** Active control pattern: `'buttons'` (default) or `'tabs'`. */
  readonly controlPattern: Signal<KjCarouselControlPattern>;
  /** Activate the slide identified by `value`. */
  activate(value: string): void;
}

/** Injection token for the root carousel directive context. */
export const KJ_CAROUSEL = new InjectionToken<KjCarouselContext>('KjCarousel');

/** Injection token for an individual carousel slide directive context. */
export const KJ_CAROUSEL_SLIDE = new InjectionToken<KjCarouselSlideContext>('KjCarouselSlide');

/** Injection token for the carousel indicators directive context. */
export const KJ_CAROUSEL_INDICATORS = new InjectionToken<KjCarouselIndicatorsContext>(
  'KjCarouselIndicators',
);
