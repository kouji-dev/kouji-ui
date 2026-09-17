import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/** Politeness setting for ARIA live regions. */
export type KjLivePoliteness = 'off' | 'polite' | 'assertive';

/**
 * Marks an element as an ARIA live region and exposes an `announce` method
 * for programmatically pushing announcements to screen readers via DOM text content.
 *
 * Announcements are written into a text node the directive owns and appends
 * to the host, so a host that renders its own children (a widget composing
 * this directive via `hostDirectives`, a summary list) keeps them across
 * announcements.
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
  private node: Text | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  /** The ARIA live politeness setting. Defaults to `'polite'`. */
  kjPoliteness = input<KjLivePoliteness>('polite');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
      if (this.clearTimer) clearTimeout(this.clearTimer);
    });
  }

  /**
   * Announces a message to screen readers by briefly clearing and re-setting text.
   * @param message - The message to announce.
   * @param durationMs - Optional duration in ms before clearing the announcement.
   */
  announce(message: string, durationMs?: number): void {
    const node = this.textNode();
    if (this.timer) clearTimeout(this.timer);
    if (this.clearTimer) clearTimeout(this.clearTimer);
    node.data = '';
    // Brief timeout lets screen readers detect the content change.
    this.timer = setTimeout(() => {
      this.timer = null;
      node.data = message;
      if (durationMs != null) {
        this.clearTimer = setTimeout(() => { this.clearTimer = null; node.data = ''; }, durationMs);
      }
    }, 50);
  }

  /** The owned announcement text node, appended to the host on first use. */
  private textNode(): Text {
    const host = this.el.nativeElement;
    const existing = this.node;
    if (existing && existing.parentNode === host) return existing;
    const node = host.ownerDocument.createTextNode('');
    host.appendChild(node);
    this.node = node;
    return node;
  }
}
