import { Directive, OnDestroy, inject } from '@angular/core';
import { KJ_BREADCRUMB } from './breadcrumb.context';

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
 * @category Core/Navigation
 */
@Directive({
  selector: 'span[kjBreadcrumbCurrent], [kjBreadcrumbCurrent]',
  standalone: true,
  host: {
    '[attr.aria-current]': '"page"',
    '[attr.data-breadcrumb-current]': '""',
  },
})
export class KjBreadcrumbCurrent implements OnDestroy {
  private readonly root = inject(KJ_BREADCRUMB);

  constructor() {
    this.root.registerCurrent();
  }

  ngOnDestroy(): void {
    this.root.unregisterCurrent();
  }
}
