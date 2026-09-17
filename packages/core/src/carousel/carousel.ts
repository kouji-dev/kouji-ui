/**
 * Aggregator for the carousel family, so `./carousel` stays one import path
 * for the nine directives. Each directive lives in its own file beside this
 * one — see `rules/architecture.md`, "One directive per file".
 */
export { KjCarousel } from './carousel-root';
export { KjCarouselViewport } from './carousel-viewport';
export { KjCarouselSlide } from './carousel-slide';
export { KjCarouselPrevious } from './carousel-previous';
export { KjCarouselNext } from './carousel-next';
export { KjCarouselIndicators } from './carousel-indicators';
export { KjCarouselIndicator } from './carousel-indicator';
export { KjCarouselAutoplay } from './carousel-autoplay';
export { KjCarouselPauseToggle } from './carousel-pause-toggle';
