import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  isDevMode,
} from '@angular/core';

/**
 * Marks an inline `<code>` element with kouji's inline-code tone — monospace
 * font, subtle background fill, and inline padding. Reflects
 * `data-tone="code"`. The directive does not handle multi-line `<pre><code>`
 * blocks; those are styled by the prose container's `pre code` selector or
 * by a consumer-wired syntax highlighter.
 *
 * Recommended host is `<code>` to preserve native semantics; applying
 * `[kjCode]` to a different element is dev-mode warned but not enforced.
 *
 * @example
 * ```html
 * <p>Run <code kjCode>npm install @kouji-ui/core</code> to install.</p>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name typography
 */
@Directive({
  selector: '[kjCode]',
  standalone: true,
  exportAs: 'kjCode',
  host: {
    '[attr.data-tone]': '"code"',
  },
})
export class KjCode {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (isDevMode()) {
      afterNextRender(() => {
        const host = this.el.nativeElement;
        if (host.tagName?.toLowerCase() !== 'code') {
          console.warn(
            `[kj] kjCode applied to <${host.tagName?.toLowerCase()}>. ` +
              `Recommended host element is <code> for native semantics ` +
              `(WCAG 1.3.1 / 4.1.2). Apply only to non-code elements when ` +
              `you have a specific styling reason.`,
          );
        }
      });
    }
  }
}
