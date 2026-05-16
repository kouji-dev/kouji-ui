import { Directive } from '@angular/core';
import { KjListSeparator } from '../primitives/list';

/**
 * A non-focusable horizontal divider between groups of menu items.
 *
 * Composes the shared `KjListSeparator` primitive — sets
 * `role="separator"` and `aria-orientation="horizontal"`. The roving
 * navigator / type-ahead in `[kjDropdownMenu]` skips it because it isn't
 * a `KjListItem`.
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
  hostDirectives: [KjListSeparator],
  host: {
    'class': 'kj-dropdown-menu-separator',
    'tabindex': '-1',
  },
})
export class KjDropdownMenuSeparator {}
