import { Directive } from '@angular/core';
import { registerOverlayTitle } from '../dialog/dialog-title';

/**
 * Marks the heading that names a `<kj-sheet>`. Mints a stable id (or keeps
 * the element's own) and registers it with the sheet, which binds it as
 * `aria-labelledby` — the `ariaLabel` option then only applies to bodies
 * without a title. Apply to whatever heading level the page's outline needs;
 * the directive never overrides `role`.
 *
 * @example
 * ```html
 * <kj-sheet>
 *   <h2 kjSheetTitle>Share</h2>
 *   …
 * </kj-sheet>
 * ```
 * @doc-category Core/Overlay
 * @doc
 * @doc-name sheet
 */
@Directive({
  selector: '[kjSheetTitle]',
  standalone: true,
  host: {
    class: 'kj-sheet__title',
    '[attr.id]': 'id',
  },
})
export class KjSheetTitle {
  /** Id the sheet references from `aria-labelledby`. */
  readonly id = registerOverlayTitle('sheet-title');
}
