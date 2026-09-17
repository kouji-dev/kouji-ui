import { DestroyRef, Directive, inject } from '@angular/core';
import { KJ_BREADCRUMB, KjBreadcrumbItemContext } from './breadcrumb.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

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
export class KjBreadcrumbItem {
  private readonly root = injectParent(KJ_BREADCRUMB, { child: 'KjBreadcrumbItem', parent: '[kjBreadcrumb]' });

  /** Public context (index, current, hidden) for this item. */
  readonly context: KjBreadcrumbItemContext;

  constructor() {
    this.context = this.root.registerItem();
    inject(DestroyRef).onDestroy(() => this.root.unregisterItem(this.context));
  }
}
