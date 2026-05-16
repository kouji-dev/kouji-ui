import { Directive } from '@angular/core';
import { KjListGroup } from '../primitives/list';

/**
 * A logical grouping of items inside a `[kjDropdownMenu]` panel.
 *
 * Composes the shared `KjListGroup` primitive — `role="group"`,
 * auto-`aria-labelledby` wiring to a child `[kjDropdownMenuLabel]`, and
 * auto-hide when every child item is filter-hidden.
 *
 * @example
 * ```html
 * <div kjDropdownMenuGroup>
 *   <span kjDropdownMenuLabel>Account</span>
 *   <button kjDropdownMenuItem>Profile</button>
 *   <button kjDropdownMenuItem>Settings</button>
 * </div>
 * ```
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjDropdownMenuGroup]',
  standalone: true,
  hostDirectives: [
    { directive: KjListGroup, inputs: ['kjId'] },
  ],
  host: {
    'class': 'kj-dropdown-menu-group',
  },
})
export class KjDropdownMenuGroup {}
