import {
  Directive,
  computed,
  contentChild,
} from '@angular/core';
import { KjDropdownMenuLabel } from './dropdown-menu-label';

/**
 * A logical grouping of items inside a `[kjDropdownMenu]` panel.
 *
 * Sets `role="group"` on the host. If a `[kjDropdownMenuLabel]` is projected
 * as a content child, its auto-generated id is wired to `aria-labelledby` so
 * AT announces the group's label.
 *
 * @example
 * ```html
 * <div kjDropdownMenuGroup>
 *   <span kjDropdownMenuLabel>Account</span>
 *   <button kjDropdownMenuItem>Profile</button>
 *   <button kjDropdownMenuItem>Settings</button>
 * </div>
 * ```
 * @category Core/Actions
 */
@Directive({
  selector: '[kjDropdownMenuGroup]',
  standalone: true,
  host: {
    'class': 'kj-dropdown-menu-group',
    'role': 'group',
    '[attr.aria-labelledby]': 'labelledBy()',
  },
})
export class KjDropdownMenuGroup {
  private readonly label = contentChild(KjDropdownMenuLabel, { descendants: true });

  /** Auto-resolved labelledby — the projected `[kjDropdownMenuLabel]`'s id, or null. */
  protected readonly labelledBy = computed(() => this.label()?.id ?? null);
}
