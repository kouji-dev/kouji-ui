import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  Signal,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Logical text direction. */
export type KjDirection = 'ltr' | 'rtl';

/**
 * Reads the document's logical text direction (`<html dir>`, falling back to
 * `<body dir>`) and exposes it as a signal that updates when the attribute
 * changes. SSR-safe — on the server the signal returns `'ltr'` and no DOM
 * APIs are touched.
 *
 * Use this for RTL-aware behaviour in directives that cannot rely on CSS
 * (e.g. computing logical positions, emitting `[attr.data-direction]`,
 * choosing arrow-key handlers).
 *
 * @example
 * ```ts
 * private readonly dir = inject(KjDirectionality);
 * readonly isRtl = computed(() => this.dir.current() === 'rtl');
 * ```
 * @category Core/Primitives
 */
@Injectable({ providedIn: 'root' })
export class KjDirectionality {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT, { optional: true }) as Document | null;

  private readonly _current = signal<KjDirection>('ltr');

  /**
   * Current document direction. `'ltr'` on the server and as the fallback
   * when no `dir` attribute is set.
   */
  readonly current: Signal<KjDirection> = this._current.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.doc) {
      // SSR: leave the default `'ltr'` and skip all DOM access.
      return;
    }

    // Read the initial value as soon as the DOM is ready. afterNextRender
    // guarantees a browser context and avoids reading during SSR.
    afterNextRender(() => {
      this._current.set(this.read());

      const html = this.doc!.documentElement;
      const observer = new MutationObserver(() => {
        const next = this.read();
        if (next !== this._current()) {
          this._current.set(next);
        }
      });
      observer.observe(html, {
        attributes: true,
        attributeFilter: ['dir'],
        subtree: false,
      });

      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Reads the effective direction from `<html dir>`, falling back to
   * `<body dir>`, then `'ltr'`. Any value other than `'rtl'` collapses to
   * `'ltr'` — `dir="auto"` is treated as LTR until the browser computes
   * something more specific (which we cannot observe via attribute changes).
   */
  private read(): KjDirection {
    const doc = this.doc;
    if (!doc) return 'ltr';
    const htmlDir = doc.documentElement?.getAttribute('dir');
    const bodyDir = doc.body?.getAttribute('dir');
    const value = (htmlDir ?? bodyDir ?? '').toLowerCase();
    return value === 'rtl' ? 'rtl' : 'ltr';
  }
}
