/**
 * Aggregator for the styled carousel family, so `./carousel` stays one import
 * path for the eight wrappers. Each component lives in its own file beside
 * this one — see `rules/architecture.md`, "One directive per file" (arch F-12).
 */
export { KjCarouselComponent } from './carousel-root';
export { KjCarouselViewportComponent } from './carousel-viewport';
export { KjCarouselSlideComponent } from './carousel-slide';
export { KjCarouselPreviousComponent } from './carousel-previous';
export { KjCarouselNextComponent } from './carousel-next';
export { KjCarouselIndicatorsComponent } from './carousel-indicators';
export { KjCarouselAutoplayComponent } from './carousel-autoplay';
export { KjCarouselPause } from './carousel-pause';

// Re-export the input types for consumer convenience.
export type {
  KjCarouselOrientation,
  KjCarouselAlign,
  KjCarouselControlPattern,
} from '@kouji-ui/core';
