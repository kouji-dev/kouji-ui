import { Directive, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Tracks focus-visible state using native PointerEvents and keyboard interaction.
 * Sets `data-focus-visible` only when the element receives focus via keyboard.
 * Compose via `hostDirectives` to add focus-ring behavior to interactive elements.
 *
 * @example
 * ```html
 * <button kjFocusRing>Focusable button</button>
 * ```
 * @category Core/Primitives
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

  private readonly _focusVisible = signal(false);

  /** Whether the element currently has visible focus (keyboard-initiated). */
  readonly focusVisible = this._focusVisible.asReadonly();

  private _lastWasPointer = false;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const onKeydown = () => { this._lastWasPointer = false; };
      const onPointerdown = () => { this._lastWasPointer = true; };
      const onFocus = () => { this._focusVisible.set(!this._lastWasPointer); };
      const onBlur = () => { this._focusVisible.set(false); };

      document.addEventListener('keydown', onKeydown, true);
      document.addEventListener('pointerdown', onPointerdown, true);
      this.el.nativeElement.addEventListener('focus', onFocus);
      this.el.nativeElement.addEventListener('blur', onBlur);

      this.destroyRef.onDestroy(() => {
        document.removeEventListener('keydown', onKeydown, true);
        document.removeEventListener('pointerdown', onPointerdown, true);
        this.el.nativeElement.removeEventListener('focus', onFocus);
        this.el.nativeElement.removeEventListener('blur', onBlur);
      });
    });
  }
}
