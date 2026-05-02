import { Directive, inject, input } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

/** Politeness setting for ARIA live regions. */
export type KjLivePoliteness = 'off' | 'polite' | 'assertive';

/**
 * Marks an element as an ARIA live region and exposes an `announce` method
 * for programmatically pushing announcements to screen readers via CDK LiveAnnouncer.
 *
 * @example
 * ```html
 * <div kjLiveRegion [kjPoliteness]="'polite'" #region="kjLiveRegion"></div>
 * <button (click)="region.announce('Item saved')">Save</button>
 * ```
 * @category Core/Accessibility/LiveRegion
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
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  /** The ARIA live politeness setting. Defaults to `'polite'`. */
  kjPoliteness = input<KjLivePoliteness>('polite');

  /**
   * Announces a message to screen readers.
   * @param message - The message to announce.
   * @param durationMs - Optional duration in ms before clearing the announcement.
   * @returns A promise that resolves when the announcement is complete.
   */
  announce(message: string, durationMs?: number): Promise<void> {
    return this.liveAnnouncer.announce(message, this.kjPoliteness(), durationMs);
  }
}
