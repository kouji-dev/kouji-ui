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
 * @category Core/Actions
 * @doc
 * @doc-name dropdown-menu
 */
@Directive({
  selector: '[kjDropdownMenuSeparator]',
  standalone: true,
  host: {
    'role': 'separator',
    'aria-orientation': 'horizontal',
    'tabindex': '-1',
  },
})
export class KjDropdownMenuSeparator {}
