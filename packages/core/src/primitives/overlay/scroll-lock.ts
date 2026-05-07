import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Body scroll lock. Ref-counted — multiple modals share one lock.
 * Compensates for the scrollbar to prevent layout shift.
 *
 * SSR-safe: server returns a no-op release function.
 */
@Injectable({ providedIn: 'root' })
export class KjScrollLock {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private _count = 0;
  private _savedOverflow: string | null = null;
  private _savedPaddingRight: string | null = null;

  acquire(): () => void {
    if (!this.isBrowser) return () => {};
    this._count++;
    if (this._count === 1) {
      const html = document.documentElement;
      const scrollbarWidth = window.innerWidth - html.clientWidth;
      this._savedOverflow = html.style.overflow;
      this._savedPaddingRight = html.style.paddingRight;
      html.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        const existing = parseFloat(getComputedStyle(html).paddingRight) || 0;
        html.style.paddingRight = `${existing + scrollbarWidth}px`;
      }
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._count--;
      if (this._count === 0) {
        const html = document.documentElement;
        html.style.overflow = this._savedOverflow ?? '';
        html.style.paddingRight = this._savedPaddingRight ?? '';
        this._savedOverflow = null;
        this._savedPaddingRight = null;
      }
    };
  }
}
