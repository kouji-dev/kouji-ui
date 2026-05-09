import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  isDevMode,
  input,
} from '@angular/core';

/**
 * Clamps the host element's text content to a fixed number of lines.
 *
 * - `kjTruncate="1"` (default) — single-line ellipsis using
 *   `text-overflow: ellipsis`.
 * - `kjTruncate="2"` and above — multi-line clamp using
 *   `-webkit-line-clamp: N`.
 *
 * The directive reflects `[attr.data-truncate]` so the kouji CSS layer can
 * apply the right rules. After the first render it reads the host's
 * `textContent` and writes a normalised `[attr.title]` **only** when the
 * consumer has not supplied a `title` or `aria-label`. This is the
 * *belt-and-braces* affordance for sighted-but-zoomed users — AT users
 * read the full text from the accessibility tree, which is unaffected by
 * the visual clamp on modern browser/AT pairings.
 *
 * The directive does *not* install a `MutationObserver` to chase content
 * changes; if the projected text changes after first render, the consumer
 * is responsible for refreshing `title` themselves.
 *
 * @example
 * ```html
 * <p kjTruncate>Single-line truncation with auto-tooltip.</p>
 * <p [kjTruncate]="3">Three-line clamp for a card description.</p>
 * <p kjTruncate title="Custom tooltip">Consumer title wins.</p>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name typography
 */
@Directive({
  selector: '[kjTruncate]',
  standalone: true,
  exportAs: 'kjTruncate',
  host: {
    '[attr.data-truncate]': 'kjTruncate()',
  },
})
export class KjTruncate {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Number of visible lines before truncation kicks in. `1` produces a
   * single-line ellipsis; values ≥ `2` produce a multi-line clamp. `0` and
   * negative values are dev-mode warnings — omit the directive instead.
   * Defaults to `1`.
   */
  readonly kjTruncate = input(1, {
    transform: (value: number | string | undefined) => {
      const n = typeof value === 'string' ? Number(value) : (value ?? 1);
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
    },
  });

  constructor() {
    afterNextRender(() => {
      const host = this.el.nativeElement;

      if (isDevMode()) {
        // Re-validate the raw input shape: the transform clamps invalid values
        // to `1`, but we still want to flag intent so the consumer fixes the
        // template rather than silently getting a single-line clamp. A bare
        // `kjTruncate` attribute (no value, the documented single-line
        // default) is allowed and skipped.
        const raw = host.getAttribute('kjTruncate') ?? host.getAttribute('kjtruncate');
        if (raw !== null && raw !== '') {
          const parsed = Number(raw);
          if (!Number.isFinite(parsed) || parsed < 1) {
            console.warn(
              `[kj] kjTruncate received "${raw}". Use a positive integer ` +
                `(1 = single-line ellipsis, 2+ = multi-line clamp), or omit ` +
                `the directive entirely.`,
            );
          }
        }
      }

      const hasTitle = host.hasAttribute('title');
      const hasAriaLabel = host.hasAttribute('aria-label');
      if (hasTitle || hasAriaLabel) {
        return;
      }

      const text = (host.textContent ?? '').trim().replace(/\s+/g, ' ');
      if (text.length > 0) {
        host.setAttribute('title', text);
      }
    });
  }
}
