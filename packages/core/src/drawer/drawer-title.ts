import { Directive } from '@angular/core';
import { registerOverlayTitle } from '../dialog/dialog-title';

/**
 * Marks the heading that names a `<kj-drawer>`. Mints a stable id (or keeps
 * the element's own) and registers it with the drawer, which binds it as
 * `aria-labelledby`. Apply to whatever heading level the page's outline
 * needs; the directive never overrides `role`.
 *
 * @example
 * ```html
 * <kj-drawer>
 *   <h2 kjDrawerTitle>Settings</h2>
 *   …
 * </kj-drawer>
 * ```
 * @doc-category Core/Overlay
 * @doc
 * @doc-name drawer
 */
@Directive({
  selector: '[kjDrawerTitle]',
  standalone: true,
  host: {
    class: 'kj-drawer-title',
    '[attr.id]': 'id',
  },
})
export class KjDrawerTitle {
  /** Id the drawer references from `aria-labelledby`. */
  readonly id = registerOverlayTitle('drawer-title');
}
