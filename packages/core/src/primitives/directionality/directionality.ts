import {
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injectable,
  PLATFORM_ID,
  type Provider,
  Signal,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Logical text direction. */
export type KjDirection = 'ltr' | 'rtl';

/**
 * Reads the effective logical text direction and exposes it as a signal that
 * updates when the underlying `dir` attribute changes. SSR-safe — on the
 * server the signal returns `'ltr'` and no DOM APIs are touched.
 *
 * ## Two scopes
 *
 * **Document (default).** Injected from anywhere without further setup, this is
 * the root singleton: it reads `<html dir>`, falling back to `<body dir>`, and
 * observes `<html>` for attribute changes. That is the right answer for an app
 * with one direction.
 *
 * **Sub-tree.** List it in a component's or directive's `providers` (or spread
 * {@link provideKjDirectionality}) and the instance becomes *element-aware*: it
 * reads the nearest `[dir]` **ancestor** of that host via `closest('[dir]')`
 * and falls back to the document read when there is none. Every directive
 * under that host resolves the scoped instance through the element injector,
 * so an Arabic widget can sit inside an English page:
 *
 * ```html
 * <section dir="rtl">
 *   <acme-widget />   <!-- providers: [provideKjDirectionality()] -->
 * </section>
 * ```
 *
 * This matches what `KjRovingTabindex` already does for arrow keys
 * (`el.closest('[dir]')`), so keyboard direction and visual direction agree
 * inside an RTL sub-tree instead of disagreeing.
 *
 * A scoped instance observes the whole document sub-tree for `dir` changes, so
 * adding, removing or flipping `dir` on *any* ancestor is picked up — at the
 * cost of one `MutationObserver` per scoped instance. Only the value of the
 * nearest ancestor is ever read.
 *
 * `dir="auto"` collapses to `'ltr'`: the browser resolves it per text run and
 * there is no attribute change to observe.
 *
 * @example
 * ```ts
 * private readonly dir = inject(KjDirectionality);
 * readonly isRtl = computed(() => this.dir.current() === 'rtl');
 * ```
 * @doc-category Core/Primitives
 */
@Injectable({ providedIn: 'root' })
export class KjDirectionality {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT, { optional: true }) as Document | null;

  /**
   * Host element when this instance was provided on a component / directive,
   * `null` for the root singleton (the root environment injector has no
   * `ElementRef` record). Its presence is what switches the service from the
   * document read to the nearest-`[dir]`-ancestor read.
   */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef, { optional: true })
    ?.nativeElement ?? null;

  private readonly _current = signal<KjDirection>('ltr');

  /**
   * Current direction: the nearest `[dir]` ancestor of the host for a scoped
   * instance, else `<html dir>` / `<body dir>`. `'ltr'` on the server and as
   * the fallback when no `dir` attribute is set.
   */
  readonly current: Signal<KjDirection> = this._current.asReadonly();

  /** `true` when this instance is scoped to a host element rather than the document. */
  readonly isScoped = this.host !== null;

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.doc) {
      // SSR: leave the default `'ltr'` and skip all DOM access.
      return;
    }

    // Read the initial value as soon as the DOM is ready. afterNextRender
    // guarantees a browser context and avoids reading during SSR.
    afterNextRender(() => {
      this._current.set(this.read());

      const observer = new MutationObserver(() => {
        const next = this.read();
        if (next !== this._current()) {
          this._current.set(next);
        }
      });
      // A scoped instance cares about every ancestor between its host and
      // `<html>`, and an ancestor's `dir` can be added or removed at runtime,
      // so it watches the whole tree and re-runs the `closest()` walk. The
      // document-level instance only ever reads `<html>` / `<body>`.
      observer.observe(this.doc!.documentElement, {
        attributes: true,
        attributeFilter: ['dir'],
        subtree: this.isScoped,
      });

      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Reads the effective direction: for a scoped instance the nearest `[dir]`
   * ancestor (the host itself counts), else `<html dir>` falling back to
   * `<body dir>`, else `'ltr'`. Any value other than `'rtl'` collapses to
   * `'ltr'` — `dir="auto"` is treated as LTR until the browser computes
   * something more specific (which we cannot observe via attribute changes).
   */
  private read(): KjDirection {
    const doc = this.doc;
    if (!doc) return 'ltr';
    const scoped = this.host?.closest('[dir]')?.getAttribute('dir');
    const htmlDir = doc.documentElement?.getAttribute('dir');
    const bodyDir = doc.body?.getAttribute('dir');
    const value = (scoped ?? htmlDir ?? bodyDir ?? '').toLowerCase();
    return value === 'rtl' ? 'rtl' : 'ltr';
  }
}

/**
 * Scopes {@link KjDirectionality} to a component / directive sub-tree.
 *
 * Spread into a `providers` array on the element that owns the sub-tree. The
 * resulting instance reads the nearest `[dir]` **ancestor** of that host
 * instead of `<html dir>`, and every descendant that injects
 * `KjDirectionality` resolves it through the element injector.
 *
 * ```ts
 * @Component({
 *   selector: 'acme-widget',
 *   providers: [...provideKjDirectionality()],
 * })
 * ```
 *
 * Without it, `KjDirectionality` stays the document-level root singleton,
 * which is the right default for a single-direction app.
 */
export function provideKjDirectionality(): Provider[] {
  return [KjDirectionality];
}
