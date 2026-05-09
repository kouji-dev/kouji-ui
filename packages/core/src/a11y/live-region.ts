import { Directive, ElementRef, inject, input } from '@angular/core';

/** Politeness setting for ARIA live regions. */
export type KjLivePoliteness = 'off' | 'polite' | 'assertive';

/**
 * Marks an element as an ARIA live region and exposes an `announce` method
 * for programmatically pushing announcements to screen readers via DOM text content.
 *
 * @example
 * ```html
 * <div kjLiveRegion [kjPoliteness]="'polite'" #region="kjLiveRegion"></div>
 * <button (click)="region.announce('Item saved')">Save</button>
 * ```
 * @doc-category Core/Accessibility
 * @doc
 * @doc-name a11y
 */
@Directive({
  selector: '[kjLiveRegion]',
  standalone: true,
  exportAs: 'kjLiveRegion',
  host: {
    '[attr.aria-live]': 'kjPoliteness()',
    '[attr.aria-atomic]': '"true"',
  },
})
export class KjLiveRegion {
  private readonly el = inject(ElementRef<HTMLElement>);

  /** The ARIA live politeness setting. Defaults to `'polite'`. */
  kjPoliteness = input<KjLivePoliteness>('polite');

  /**
   * Announces a message to screen readers by briefly clearing and re-setting text.
   * @param message - The message to announce.
   * @param durationMs - Optional duration in ms before clearing the announcement.
   */
  announce(message: string, durationMs?: number): void {
    const el = this.el.nativeElement;
    el.textContent = '';
    // Brief timeout lets screen readers detect the content change.
    setTimeout(() => {
      el.textContent = message;
      if (durationMs != null) {
        setTimeout(() => { el.textContent = ''; }, durationMs);
      }
    }, 50);
  }
}
