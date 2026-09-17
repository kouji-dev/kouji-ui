import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * One app-wide `ResizeObserver`, shared by every element that needs to react
 * to its own box changing.
 *
 * A `ResizeObserver` can watch any number of elements, so a chart per card or
 * a toast per notification does not need one each — this service keeps a
 * single instance, dispatches each entry to the callbacks registered for that
 * element, and coalesces a burst of entries into one animation frame so a
 * drag-resize costs one callback per frame instead of one per entry.
 *
 * SSR-safe: on the server (or where `ResizeObserver` is unavailable)
 * {@link observe} installs nothing and returns a no-op disposer.
 *
 * @example
 * ```ts
 * private readonly resizes = inject(KjResizeObserver);
 * private readonly destroyRef = inject(DestroyRef);
 *
 * constructor() {
 *   afterNextRender(() => {
 *     this.destroyRef.onDestroy(
 *       this.resizes.observe(this.el.nativeElement, () => this.chart?.resize()),
 *     );
 *   });
 * }
 * ```
 * @doc-category Core/Primitives
 * @doc-name interaction
 */
@Injectable({ providedIn: 'root' })
export class KjResizeObserver {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private observer: ResizeObserver | null = null;
  private readonly callbacks = new Map<Element, Set<() => void>>();
  private readonly pending = new Set<Element>();
  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /**
   * Runs `callback` whenever `element`'s box changes, coalesced to one
   * animation frame.
   *
   * @returns a disposer that unregisters the callback; the element is
   *   unobserved once nothing is registered for it, and the shared observer is
   *   disconnected once nothing at all is observed.
   */
  observe(element: Element, callback: () => void): () => void {
    if (!this.isBrowser || typeof ResizeObserver === 'undefined') return () => {};
    const observer = (this.observer ??= new ResizeObserver((entries) => this.onResize(entries)));
    const existing = this.callbacks.get(element);
    if (existing) {
      existing.add(callback);
    } else {
      this.callbacks.set(element, new Set([callback]));
      observer.observe(element);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const set = this.callbacks.get(element);
      if (!set) return;
      set.delete(callback);
      if (set.size > 0) return;
      this.callbacks.delete(element);
      this.pending.delete(element);
      this.observer?.unobserve(element);
      if (this.callbacks.size === 0) this.teardown();
    };
  }

  private onResize(entries: readonly ResizeObserverEntry[]): void {
    for (const entry of entries) this.pending.add(entry.target);
    if (this.frame) return;
    const view = this.document?.defaultView;
    if (!view?.requestAnimationFrame) {
      this.flush();
      return;
    }
    this.frame = view.requestAnimationFrame(() => {
      this.frame = 0;
      this.flush();
    });
  }

  private flush(): void {
    const targets = [...this.pending];
    this.pending.clear();
    for (const target of targets) {
      // Copy first: a callback may dispose itself while running.
      for (const fn of [...(this.callbacks.get(target) ?? [])]) fn();
    }
  }

  private teardown(): void {
    if (this.frame) this.document?.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pending.clear();
    this.callbacks.clear();
    this.observer?.disconnect();
    this.observer = null;
  }
}
