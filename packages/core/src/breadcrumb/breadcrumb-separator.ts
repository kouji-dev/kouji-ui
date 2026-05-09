import { Directive, OnDestroy, inject } from '@angular/core';
import { KJ_BREADCRUMB } from './breadcrumb.context';

/**
 * Optional explicit separator cell. Used when a CSS pseudo-element will not
 * do — typically for an icon (SVG) separator that needs `currentColor`,
 * `width`, and `height` plumbing the pseudo-element cannot deliver.
 *
 * Registers with the parent so the auto separator (CSS `::before`) is
 * suppressed via the `data-explicit-separators=""` attribute on the list.
 *
 * Selector restricted to `<li>` so the list semantics stay clean
 * (every direct child of `<ol>` must be `<li>`); the directive sets
 * `role="presentation"` and `aria-hidden="true"` so AT does not announce
 * the separator as a list item.
 *
 * @example
 * ```html
 * <li kjBreadcrumbSeparator><svg>…chevron…</svg></li>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Directive({
  selector: '[kjBreadcrumbSeparator]',
  standalone: true,
  host: {
    'role': 'presentation',
    '[attr.aria-hidden]': '"true"',
    '[attr.data-breadcrumb-separator]': '""',
  },
})
export class KjBreadcrumbSeparator implements OnDestroy {
  private readonly root = inject(KJ_BREADCRUMB);

  constructor() {
    this.root.registerSeparator();
  }

  ngOnDestroy(): void {
    this.root.unregisterSeparator();
  }
}
