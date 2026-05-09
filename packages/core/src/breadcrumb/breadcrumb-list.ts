import { Directive, inject, input } from '@angular/core';
import { KJ_BREADCRUMB } from './breadcrumb.context';

/**
 * The breadcrumb's ordered list. Selector restricted to `<ol>` to enforce
 * ordered-list semantics (a `<ul>` will not match).
 *
 * Reads the parent's `hasExplicitSeparators` and `overflow` signals to
 * reflect data attributes that key the CSS layer:
 * - `data-explicit-separators=""` suppresses the auto pseudo-element.
 * - `data-overflow="truncate|menu|none"` mirrors the root's overflow mode.
 * - `data-wrap="wrap|no-wrap|truncate"` reflects this directive's wrap input.
 *
 * @example
 * ```html
 * <ol kjBreadcrumbList>…</ol>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Directive({
  selector: '[kjBreadcrumbList]',
  standalone: true,
  host: {
    '[attr.data-explicit-separators]': 'ctx.hasExplicitSeparators() ? "" : null',
    '[attr.data-overflow]': 'ctx.overflow()',
    '[attr.data-wrap]': 'kjWrap()',
  },
})
export class KjBreadcrumbList {
  /** @internal */
  readonly ctx = inject(KJ_BREADCRUMB);

  /**
   * Wrapping policy. `'no-wrap'` keeps the row single-line (the truncation
   * does the long-path work); `'wrap'` allows the row to break across
   * lines; `'truncate'` reserved for future ellipsis-by-CSS support.
   */
  readonly kjWrap = input<'wrap' | 'no-wrap' | 'truncate'>('no-wrap');
}
