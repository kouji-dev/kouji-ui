import { Directive, DestroyRef, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(',');

/**
 * Traps keyboard focus within the host element using a native Tab-key interceptor.
 * Designed for modal dialogs, drawers, and other overlay patterns.
 *
 * @example
 * ```html
 * <div role="dialog" kjFocusTrap [kjFocusTrapEnabled]="isOpen()">
 *   <button>Action</button>
 * </div>
 * ```
 * @category Core/Accessibility
 */
@Directive({
  selector: '[kjFocusTrap]',
  standalone: true,
})
export class KjFocusTrap {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Whether the focus trap is active. Set to true when the overlay is open. */
  kjFocusTrapEnabled = input<boolean>(false);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const handleKeydown = (e: KeyboardEvent) => {
        if (!this.kjFocusTrapEnabled() || e.key !== 'Tab') return;
        const focusable = (Array.from(
          this.el.nativeElement.querySelectorAll(FOCUSABLE)
        ) as HTMLElement[]).filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none');

        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !this.el.nativeElement.contains(document.activeElement)) {
            e.preventDefault(); last.focus();
          }
        } else {
          if (document.activeElement === last || !this.el.nativeElement.contains(document.activeElement)) {
            e.preventDefault(); first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeydown);
      this.destroyRef.onDestroy(() => document.removeEventListener('keydown', handleKeydown));
    });
  }

  /** Focuses the first tabbable element inside the trap. */
  focusFirst(): void {
    const el = this.el.nativeElement.querySelector(FOCUSABLE) as HTMLElement | null;
    el?.focus();
  }
}
