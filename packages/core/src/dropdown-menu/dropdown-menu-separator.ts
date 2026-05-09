import { Directive } from '@angular/core';

/**
 * A non-focusable horizontal divider between groups of menu items.
 *
 * Sets `role="separator"`, `aria-orientation="horizontal"`, `tabindex="-1"`.
 * The roving tabindex / type-ahead inside `[kjDropdownMenu]` skips it.
 *
 * @example
 * ```html
 * <div kjDropdownMenuSeparator></div>
 * ```
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjDropdownMenuSeparator]',
  standalone: true,
  host: {
    'class': 'kj-dropdown-menu-separator',
    'role': 'separator',
    'aria-orientation': 'horizontal',
    'tabindex': '-1',
  },
})
export class KjDropdownMenuSeparator {}
