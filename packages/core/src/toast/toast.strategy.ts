import { InjectionToken, Provider } from '@angular/core';
import { KjToastPositionX, KjToastPositionY } from './toast.types';

/**
 * Behaviour and layout defaults for the toast viewport. Strategies are provided
 * via DI — both the service (for duration default) and `[kjToastViewport]` (for
 * positioning, gap, max visible, expand-on-hover) inject this token.
 */
export interface KjToastStrategy {
  /** Cap on simultaneously-rendered toasts. Excess stays queued. */
  maxVisible: number;
  /** Pixel gap between stacked toasts — exposed as `--kj-toast-gap`. */
  gap: number;
  /** Base `z-index` for stacked toasts — exposed as `--kj-toast-z-index`. */
  baseZIndex: number;
  /** Horizontal anchor. */
  positionX: KjToastPositionX;
  /** Vertical anchor. */
  positionY: KjToastPositionY;
  /** Default auto-dismiss delay in ms. `0` = persistent. */
  duration: number;
  /** When `true`, the viewport flips `data-expanded` on `mouseenter` / `mouseleave`. */
  expandOnHover: boolean;
  /**
   * When `true`, the viewport pauses every in-flight auto-dismiss timer while
   * the pointer hovers it or focus is inside it. Required for WCAG 2.2.1 (AAA)
   * and 1.4.13 — without it, a user reaching for the toast's action button
   * may have it disappear underneath them. Distinct from `expandOnHover`,
   * which controls visual stacking only.
   */
  pauseOnHover: boolean;
}

/**
 * Sonner-inspired defaults: max 3 visible, stacked at the bottom-right,
 * expand on hover, 4s default duration, 14px gap. Matches the popular
 * [Sonner](https://sonner.emilkowal.ski) toast feel.
 */
export const KJ_TOAST_SONNER_STRATEGY: KjToastStrategy = Object.freeze({
  maxVisible: 3,
  gap: 14,
  baseZIndex: 100,
  positionX: 'end',
  positionY: 'bottom',
  duration: 4000,
  expandOnHover: true,
  pauseOnHover: true,
});

/**
 * Plain vertical list: unlimited visible, no hover expansion, standard 5s duration.
 * Closer to Material / Bootstrap-style "stacked notifications" with no fancy stacking.
 */
export const KJ_TOAST_LIST_STRATEGY: KjToastStrategy = Object.freeze({
  maxVisible: Number.POSITIVE_INFINITY,
  gap: 8,
  baseZIndex: 100,
  positionX: 'end',
  positionY: 'bottom',
  duration: 5000,
  expandOnHover: false,
  pauseOnHover: true,
});

/** DI token holding the active toast strategy. Defaults to `KJ_TOAST_SONNER_STRATEGY`. */
export const KJ_TOAST_STRATEGY = new InjectionToken<KjToastStrategy>('KjToastStrategy', {
  providedIn: 'root',
  factory: () => KJ_TOAST_SONNER_STRATEGY,
});

/**
 * Use Sonner-inspired stacking (3 visible, expand on hover, bottom-right).
 * Pass `overrides` to tweak any individual property without rewriting the rest.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideKjToastSonnerStrategy({ positionY: 'top' }),
 *   ],
 * });
 * ```
 */
export function provideKjToastSonnerStrategy(overrides?: Partial<KjToastStrategy>): Provider {
  return {
    provide: KJ_TOAST_STRATEGY,
    useValue: { ...KJ_TOAST_SONNER_STRATEGY, ...overrides },
  };
}

/**
 * Use a plain vertical list (unlimited, no hover expansion).
 *
 * @example
 * ```ts
 * provideKjToastListStrategy({ maxVisible: 5, positionX: 'start' })
 * ```
 */
export function provideKjToastListStrategy(overrides?: Partial<KjToastStrategy>): Provider {
  return {
    provide: KJ_TOAST_STRATEGY,
    useValue: { ...KJ_TOAST_LIST_STRATEGY, ...overrides },
  };
}

/** Fully-custom strategy override. */
export function provideKjToastStrategy(strategy: KjToastStrategy): Provider {
  return {
    provide: KJ_TOAST_STRATEGY,
    useValue: strategy,
  };
}
