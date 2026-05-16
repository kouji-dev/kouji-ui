import { Directive, inject } from '@angular/core';
import { KjListGroupLabel } from '../primitives/list';

/**
 * A non-interactive heading inside a `[kjDropdownMenu]` panel.
 *
 * Composes the shared `KjListGroupLabel` primitive, which mints a stable
 * id and registers it with the surrounding `[kjDropdownMenuGroup]`
 * (composing `KjListGroup`) so screen readers announce the group with
 * the label's text content via `aria-labelledby`.
 *
 * Sets `role="presentation"` — the label is heading text, not a
 * focusable item, and the surrounding navigator skips it.
 *
 * @example
 * ```html
 * <span kjDropdownMenuLabel>Account</span>
 * ```
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjDropdownMenuLabel]',
  standalone: true,
  exportAs: 'kjDropdownMenuLabel',
  hostDirectives: [
    { directive: KjListGroupLabel, inputs: ['kjId'] },
  ],
  host: {
    'class': 'kj-dropdown-menu-label',
    'role': 'presentation',
  },
})
export class KjDropdownMenuLabel {
  /** Composed label primitive — exposes the resolved id. */
  private readonly label = inject(KjListGroupLabel, { self: true });

  /** Stable id used by a wrapping `[kjDropdownMenuGroup]` for `aria-labelledby`. */
  get id(): string {
    return this.label.id();
  }
}
