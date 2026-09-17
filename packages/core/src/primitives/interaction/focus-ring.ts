import { Directive, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjInputModality } from './input-modality';

/**
 * Tracks focus-visible state using native PointerEvents and keyboard interaction.
 * Sets `data-focus-visible` only when the element receives focus via keyboard.
 * Compose via `hostDirectives` to add focus-ring behavior to interactive elements.
 *
 * "Was the last interaction a key or a pointer?" is page-global state, so it is
 * read from the root {@link KjInputModality} service — one document listener
 * pair for the whole app — rather than tracked per instance. Only the two
 * element-scoped `focus` / `blur` listeners live here. The modality is sampled
 * at focus time, not tracked reactively: a pointer press elsewhere on the page
 * must not strip the ring off an element that is still focused.
 *
 * @example
 * ```html
 * <button kjFocusRing>Focusable button</button>
 * ```
 * @doc-category Core/Primitives
 * @doc
 * @doc-name interaction
 */
@Directive({
  selector: '[kjFocusRing]',
  standalone: true,
  host: {
    '[attr.data-focus-visible]': 'focusVisible() ? "" : null',
  },
})
export class KjFocusRing {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly inputModality = inject(KjInputModality);

  private readonly _focusVisible = signal(false);

  /** Whether the element currently has visible focus (keyboard-initiated). */
  readonly focusVisible = this._focusVisible.asReadonly();

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const onFocus = () => {
        this._focusVisible.set(this.inputModality.modality() === 'keyboard');
      };
      const onBlur = () => { this._focusVisible.set(false); };

      const releaseModality = this.inputModality.retain();
      this.el.nativeElement.addEventListener('focus', onFocus);
      this.el.nativeElement.addEventListener('blur', onBlur);

      this.destroyRef.onDestroy(() => {
        releaseModality();
        this.el.nativeElement.removeEventListener('focus', onFocus);
        this.el.nativeElement.removeEventListener('blur', onBlur);
      });
    });
  }
}
