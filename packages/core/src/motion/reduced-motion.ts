import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  Signal,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Media query that matches when the user has asked the OS to reduce motion.
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reads the user's `prefers-reduced-motion` OS setting via `matchMedia` and
 * exposes it as a signal that updates live when the setting flips. SSR-safe —
 * on the server (or where `matchMedia` is unavailable) the signal returns
 * `false` and no DOM APIs are touched.
 *
 * Pair this with the `motion.css` presets (which already no-op under reduced
 * motion in pure CSS) whenever a directive needs the value in TypeScript — e.g.
 * to shorten a JS-driven timeout, skip an imperative animation, or await
 * `animationend` only when motion is actually running.
 *
 * @example
 * ```ts
 * private readonly motion = inject(KjReducedMotion);
 * readonly animate = computed(() => !this.motion.prefersReducedMotion());
 * ```
 * @doc-category Core/Primitives
 * @doc-name reduced-motion
 * @doc-description SSR-safe signal of the user's prefers-reduced-motion setting.
 */
@Injectable({ providedIn: 'root' })
export class KjReducedMotion {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _prefersReducedMotion = signal(false);

  /**
   * `true` when the user has requested reduced motion. `false` on the server
   * and as the fallback when `matchMedia` is unavailable.
   */
  readonly prefersReducedMotion: Signal<boolean> = this._prefersReducedMotion.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined' || !window.matchMedia) {
      // SSR / no matchMedia: keep the default `false` and skip all DOM access.
      return;
    }

    // Read the initial value once a browser context is guaranteed, then track
    // changes. afterNextRender avoids reading during SSR.
    afterNextRender(() => {
      const mql = window.matchMedia(REDUCED_MOTION_QUERY);
      this._prefersReducedMotion.set(mql.matches);

      const onChange = (event: MediaQueryListEvent) => {
        this._prefersReducedMotion.set(event.matches);
      };
      mql.addEventListener('change', onChange);

      this.destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
    });
  }
}
