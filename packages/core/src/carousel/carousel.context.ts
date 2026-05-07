import { InjectionToken, Signal } from '@angular/core';

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
