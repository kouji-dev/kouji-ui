import { InjectionToken, type Signal } from '@angular/core';

/**
 * Logical corner placement for an overlay badge. The `start`/`end` keywords
 * map to `inset-inline-start` / `inset-inline-end` in CSS so RTL flipping
 * happens at the style layer without any JS bidi reads.
 */
export type KjOverlayBadgePosition =
  | 'top-end'
  | 'top-start'
  | 'bottom-end'
  | 'bottom-start';

/** Context shared between {@link KjOverlayBadge} and {@link KjOverlayBadgeContent}. */
export interface KjOverlayBadgeContext {
  /** Stable id of the badge content node. */
  readonly contentId: Signal<string>;
  /** Stable id of the visually-hidden description node, when present. */
  readonly descriptionId: Signal<string>;
  /** Logical corner of the anchor where the badge is placed. */
  readonly position: Signal<KjOverlayBadgePosition>;
  /** Presence-dot mode flag. */
  readonly dot: Signal<boolean>;
  /** Decorative opt-out flag — when true, the content is `aria-hidden`. */
  readonly decorative: Signal<boolean>;
  /** The accessible description text — empty string means "no description". */
  readonly description: Signal<string>;
}

/** Injection token for the {@link KjOverlayBadge} context. */
export const KJ_OVERLAY_BADGE = new InjectionToken<KjOverlayBadgeContext>('KjOverlayBadge');

let _overlayBadgeIdCounter = 0;
/** Allocates a stable id used for the badge content node + `aria-describedby` wiring. */
export function nextOverlayBadgeId(): string {
  return `kj-overlay-badge-${++_overlayBadgeIdCounter}`;
}
