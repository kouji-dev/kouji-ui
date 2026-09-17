import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  Signal,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

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
 * There are two readers, and the difference matters. {@link prefersReducedMotion}
 * is the *reactive* one and is deliberately seeded in `afterNextRender`, so the
 * first client render matches the server's and hydration does not mismatch —
 * which means it reads `false` until that render. {@link matchesNow} is the
 * *imperative* one: it answers from the live `MediaQueryList` at the moment you
 * ask, including before the first render, and is what a one-shot decision
 * ("should I wait for `animationend`?") needs. Both share one `MediaQueryList`
 * for the whole page — perf F-15 is about not allocating a new media query per
 * component, or per overlay transition.
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

  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly _prefersReducedMotion = signal(false);

  /**
   * The one `MediaQueryList` for the page. `undefined` = not resolved yet,
   * `null` = resolved and unavailable (server, or no `matchMedia`).
   */
  private mql: MediaQueryList | null | undefined;

  /**
   * `true` when the user has requested reduced motion. `false` on the server
   * and as the fallback when `matchMedia` is unavailable.
   */
  readonly prefersReducedMotion: Signal<boolean> = this._prefersReducedMotion.asReadonly();

  /**
   * The live value, read at call time. Unlike {@link prefersReducedMotion} this
   * is correct before the first render — use it for a one-shot imperative
   * decision, never for a template binding (it is not reactive, and reading the
   * OS setting during the hydrating render is what causes a mismatch).
   *
   * Returns `false` on the server and wherever `matchMedia` is unavailable.
   */
  matchesNow(): boolean {
    return this.query()?.matches ?? false;
  }

  /** Lazily resolve — and then cache — the page's single `MediaQueryList`. */
  private query(): MediaQueryList | null {
    if (this.mql === undefined) {
      const view = this.document?.defaultView;
      this.mql =
        isPlatformBrowser(this.platformId) && typeof view?.matchMedia === 'function'
          ? view.matchMedia(REDUCED_MOTION_QUERY)
          : null;
    }
    return this.mql;
  }

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.document?.defaultView?.matchMedia) {
      // SSR / no matchMedia: keep the default `false` and skip all DOM access.
      return;
    }

    // Seed the REACTIVE signal after the first render, never during it: on a
    // hydrating client the server rendered with `false`, so writing `true` here
    // would change bindings mid-hydration. `matchesNow()` is the escape hatch
    // for callers that need the live value earlier.
    afterNextRender(() => {
      const mql = this.query();
      if (!mql) return;
      this._prefersReducedMotion.set(mql.matches);

      const onChange = (event: MediaQueryListEvent) => {
        this._prefersReducedMotion.set(event.matches);
      };
      mql.addEventListener('change', onChange);

      this.destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
    });
  }
}
