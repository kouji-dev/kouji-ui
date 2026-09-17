import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

/**
 * Marks an inline `<code>` element with kouji's inline-code tone — monospace
 * font, subtle background fill, and inline padding. Reflects
 * `data-kj-tone="code"`. The directive does not handle multi-line `<pre><code>`
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
    '[attr.data-kj-tone]': '"code"',
  },
})
export class KjCode {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (kjDevMode()) {
      afterNextRender(() => {
        const host = this.el.nativeElement;
        if (host.tagName?.toLowerCase() !== 'code') {
          kjDevWarn(
            'kjCode',
            `applied to <${host.tagName?.toLowerCase()}>. ` +
              `Recommended host element is <code> for native semantics ` +
              `(WCAG 1.3.1 / 4.1.2). Apply only to non-code elements when ` +
              `you have a specific styling reason.`,
          );
        }
      });
    }
  }
}
