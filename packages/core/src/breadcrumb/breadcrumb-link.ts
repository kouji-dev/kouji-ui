import { Directive, inject } from '@angular/core';
import { KjLink } from '../link/link';
import { KJ_BREADCRUMB } from './breadcrumb.context';

/**
 * Per-crumb anchor. Composes `KjLink` via `hostDirectives` so the per-crumb
 * `<a>` inherits external-link `rel` plumbing, focus-ring composition, and
 * disabled-link enforcement.
 *
 * The directive deliberately does **not** forward `KjLink`'s own inputs onto
 * its own selector — the components-package wrapper (`<kj-breadcrumb-link>`)
 * is the authoring surface for those, and consumers driving the directive
 * directly can apply `kjLink` inputs on the same element (since `KjLink` is
 * composed via `hostDirectives`, the inputs land on it through the host).
 *
 * The wrapper applies breadcrumb defaults: `muted` variant, `sm` size,
 * `hover` underline.
 *
 * @example
 * ```html
 * <a kjBreadcrumbLink href="/library">Library</a>
 * ```
 *
 * @category Core/Navigation
 */
@Directive({
  selector: 'a[kjBreadcrumbLink], [kjBreadcrumbLink]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjLink,
      inputs: ['kjUnderline', 'kjExternal', 'kjDisabled'],
    },
  ],
  host: {
    '[attr.data-breadcrumb-link]': '""',
  },
})
export class KjBreadcrumbLink {
  /** @internal */
  readonly ctx = inject(KJ_BREADCRUMB);
}
