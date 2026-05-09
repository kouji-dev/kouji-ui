import { Directive } from '@angular/core';

let _popoverTitleIdCounter = 0;
/** Allocate a stable id used for the panel's `aria-labelledby`. */
export function nextPopoverTitleId(): string {
  return `kj-popover-title-${++_popoverTitleIdCounter}`;
}

/**
 * Marks the heading element inside the popover content. Generates a stable
 * id so consumer code (or a future panel-level hook) can wire
 * `aria-labelledby`.
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
  /** Auto-generated id used for the panel's `aria-labelledby`. */
  readonly titleId = nextPopoverTitleId();
}
