import { DestroyRef, Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/** How the user last interacted with the page. */
export type KjInputModalityKind = 'keyboard' | 'pointer';

/**
 * One app-wide reader of "was the last interaction a key or a pointer?".
 *
 * The answer is inherently global, so it is tracked once: this service holds a
 * single `keydown` + `pointerdown` capture-listener pair on the document and
 * fans the result out to every consumer through {@link modality}. Before this
 * existed, every `KjFocusRing` kept its own copy and its own listener pair — a
 * 200-row table with a checkbox and a button per row installed 800
 * document-level capture listeners, all of which ran on every keystroke.
 *
 * The listener pair is ref-counted: {@link retain} installs it on the first
 * consumer and the returned disposer removes it when the last one goes away,
 * so an app that renders no focus ring pays nothing. SSR-safe — on the server
 * the signal stays `'keyboard'` and no DOM API is touched.
 *
 * Read {@link modality} imperatively at the moment you need it (inside a
 * `focus` handler, say) rather than in a `computed`: it flips for the *whole
 * page*, and a focused element that reacted to a pointer press elsewhere would
 * drop its ring while still focused, which is not what `:focus-visible` does.
 *
 * @example
 * ```ts
 * private readonly modality = inject(KjInputModality);
 * private readonly destroyRef = inject(DestroyRef);
 *
 * constructor() {
 *   afterNextRender(() => {
 *     this.destroyRef.onDestroy(this.modality.retain());
 *   });
 * }
 * ```
 * @doc-category Core/Primitives
 * @doc-name interaction
 */
@Injectable({ providedIn: 'root' })
export class KjInputModality {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Starts at `'keyboard'` so the very first focus on a page — which a
   * keyboard user reaches by Tab, and which no pointer press preceded — shows
   * its ring.
   */
  private readonly _modality = signal<KjInputModalityKind>('keyboard');

  /** How the user last interacted with the page. */
  readonly modality: Signal<KjInputModalityKind> = this._modality.asReadonly();

  private refCount = 0;
  private detach: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.refCount = 0;
      this.detach?.();
      this.detach = null;
    });
  }

  /**
   * Declares interest in the shared listeners, installing them on the first
   * call. Call the returned disposer (from `DestroyRef.onDestroy`) to drop the
   * interest; the listeners come off once nothing holds one. Calling a
   * disposer twice is a no-op.
   */
  retain(): () => void {
    if (!this.isBrowser) return () => {};
    this.refCount++;
    if (this.refCount === 1) this.attach();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.refCount--;
      if (this.refCount === 0) {
        this.detach?.();
        this.detach = null;
      }
    };
  }

  private attach(): void {
    const doc = this.document;
    if (!doc || this.detach) return;
    const onKeydown = () => this._modality.set('keyboard');
    const onPointerdown = () => this._modality.set('pointer');
    // Capture phase: the answer has to be current before any focus handler
    // further down the tree reads it.
    doc.addEventListener('keydown', onKeydown, true);
    doc.addEventListener('pointerdown', onPointerdown, true);
    this.detach = () => {
      doc.removeEventListener('keydown', onKeydown, true);
      doc.removeEventListener('pointerdown', onPointerdown, true);
    };
  }
}
