import { Directive, OnDestroy, inject } from '@angular/core';
import { KJ_BREADCRUMB, KjBreadcrumbItemContext } from './breadcrumb.context';

/**
 * A single crumb cell. Registers itself with the parent breadcrumb on
 * construction (capturing its index) and exposes a `current` signal derived
 * from "am I last + no explicit current cell?".
 *
 * Selector restricted to `<li>` to keep the list semantics clean.
 *
 * @example
 * ```html
 * <li kjBreadcrumbItem>…</li>
 * ```
 *
 * @doc-category Core/Navigation
 * @doc
 * @doc-name breadcrumb
 */
@Directive({
  selector: '[kjBreadcrumbItem]',
  standalone: true,
  host: {
    '[attr.data-hidden]': 'context.hidden() ? "" : null',
    '[attr.aria-current]': 'context.current() ? "page" : null',
  },
})
export class KjBreadcrumbItem implements OnDestroy {
  private readonly root = inject(KJ_BREADCRUMB);

  /** Public context (index, current, hidden) for this item. */
  readonly context: KjBreadcrumbItemContext;

  constructor() {
    this.context = this.root.registerItem();
  }

  ngOnDestroy(): void {
    this.root.unregisterItem(this.context);
  }
}
