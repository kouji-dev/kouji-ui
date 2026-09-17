import { DestroyRef, Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/** Attributes a kj theme switch is carried on. */
const THEME_ATTRIBUTES = ['class', 'data-theme'];

/** One `MutationObserver` plus the handlers registered against its target. */
interface KjObservedThemeTarget {
  readonly observer: MutationObserver;
  readonly handlers: Set<() => void>;
}

/**
 * One app-wide watcher for kj theme switches — a `class` or `data-theme`
 * change on `<html>`, or on a scoped theme wrapper such as
 * `<div data-theme="dark">`.
 *
 * Every consumer that re-reads resolved `--kj-*` tokens after a theme change
 * (charts re-resolving their palette, the Monaco editor re-deriving its theme)
 * used to attach its own `MutationObserver` to `document.documentElement`: a
 * 20-chart dashboard put 20 observers on one node, each firing on every theme
 * toggle. This service keeps **one** observer per observed element, shared by
 * every handler registered against it, and disconnects it when the last
 * handler goes away.
 *
 * SSR-safe: on the server (or where `MutationObserver` is unavailable)
 * {@link observe} installs nothing and returns a no-op disposer.
 *
 * @example
 * ```ts
 * private readonly themes = inject(KjThemeObserver);
 * private readonly destroyRef = inject(DestroyRef);
 *
 * constructor() {
 *   afterNextRender(() => {
 *     const scope = this.el.nativeElement.closest('[data-theme]');
 *     this.destroyRef.onDestroy(this.themes.observe(() => this.refresh(), scope));
 *   });
 * }
 * ```
 * @doc-category Core/Primitives
 * @doc-name interaction
 */
@Injectable({ providedIn: 'root' })
export class KjThemeObserver {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _version = signal(0);

  /**
   * Bumped on every observed theme mutation. Read it from a `computed` when a
   * derived value should re-resolve on a theme switch; use {@link observe}
   * when the reaction is imperative (re-applying an option on a third-party
   * instance).
   */
  readonly version: Signal<number> = this._version.asReadonly();

  private readonly targets = new Map<Element, KjObservedThemeTarget>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const target of this.targets.values()) target.observer.disconnect();
      this.targets.clear();
    });
  }

  /**
   * Runs `handler` whenever the theme changes on `<html>` — and, when `scope`
   * is given, on that element too (the host's nearest `[data-theme]` ancestor
   * is the usual one, since a scoped wrapper wins for the tokens resolved on
   * the host).
   *
   * @returns a disposer that unregisters the handler; the underlying observer
   *   is disconnected once nothing is registered against its target.
   */
  observe(handler: () => void, scope?: Element | null): () => void {
    const root = this.document?.documentElement ?? null;
    if (!this.isBrowser || typeof MutationObserver === 'undefined' || !root) {
      return () => {};
    }
    const elements = scope && scope !== root ? [root, scope] : [root];
    for (const el of elements) this.register(el, handler);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const el of elements) this.unregister(el, handler);
    };
  }

  private register(element: Element, handler: () => void): void {
    const existing = this.targets.get(element);
    if (existing) {
      existing.handlers.add(handler);
      return;
    }
    const handlers = new Set<() => void>([handler]);
    const observer = new MutationObserver(() => {
      this._version.update((n) => n + 1);
      // Copy first: a handler may dispose itself (or a sibling) while running.
      for (const fn of [...handlers]) fn();
    });
    observer.observe(element, { attributes: true, attributeFilter: THEME_ATTRIBUTES });
    this.targets.set(element, { observer, handlers });
  }

  private unregister(element: Element, handler: () => void): void {
    const target = this.targets.get(element);
    if (!target) return;
    target.handlers.delete(handler);
    if (target.handlers.size === 0) {
      target.observer.disconnect();
      this.targets.delete(element);
    }
  }
}
