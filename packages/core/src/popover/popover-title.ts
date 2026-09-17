import { Directive } from '@angular/core';
import { mintKjId } from '../primitives/overlay/id';
import { registerOverlayTitle } from '../dialog/dialog-title';

/** Allocate a stable id used for the panel's `aria-labelledby`. */
export function nextPopoverTitleId(): string {
  return mintKjId('popover-title');
}

/**
 * Marks the heading element inside the popover content. Mints a stable id
 * (or keeps the element's own) and registers it with the enclosing
 * `<kj-popover-content>`, which binds it as `aria-labelledby` — so the
 * `role="dialog"` panel is announced by its title rather than as an unnamed
 * dialog (WCAG 4.1.2).
 *
 * Mirrors `KjDialogTitle` in the dialog family — applied to whatever heading
 * level the consumer's information architecture wants (`<h2>` … `<h4>`),
 * the directive does not override `role`.
 *
 * @example
 * ```html
 * <kj-popover-content [kjFor]="t">
 *   <h2 kjPopoverTitle>Profile settings</h2>
 *   …
 * </kj-popover-content>
 * ```
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjPopoverTitle]',
  standalone: true,
  host: {
    'class': 'kj-popover-title',
    '[attr.id]': 'titleId',
  },
})
export class KjPopoverTitle {
  /** Resolved id the panel uses for `aria-labelledby`. */
  readonly titleId = registerOverlayTitle('popover-title');
}
