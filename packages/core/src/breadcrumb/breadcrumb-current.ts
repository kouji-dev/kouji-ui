import { DestroyRef, Directive, inject } from '@angular/core';
import { KJ_BREADCRUMB } from './breadcrumb.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * The terminal "current page" cell. Emits `aria-current="page"` and
 * registers with the parent so auto-current detection knows to step aside.
 *
 * The element is text — not focusable, not an anchor. Place inside the last
 * `<li kjBreadcrumbItem>` to mark the current page explicitly.
 *
 * @example
 * ```html
 * <span kjBreadcrumbCurrent>Data</span>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Directive({
  selector: 'span[kjBreadcrumbCurrent], [kjBreadcrumbCurrent]',
  standalone: true,
  host: {
    '[attr.aria-current]': '"page"',
    '[attr.data-breadcrumb-current]': '""',
  },
})
export class KjBreadcrumbCurrent {
  private readonly root = injectParent(KJ_BREADCRUMB, { child: 'KjBreadcrumbCurrent', parent: '[kjBreadcrumb]' });

  constructor() {
    this.root.registerCurrent();
    inject(DestroyRef).onDestroy(() => this.root.unregisterCurrent());
  }
}
