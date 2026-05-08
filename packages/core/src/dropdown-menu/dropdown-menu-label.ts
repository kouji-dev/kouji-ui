import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
} from '@angular/core';
import { nextDropdownMenuLabelId } from './dropdown-menu.context';

/**
 * A non-interactive heading inside a `[kjDropdownMenu]` panel.
 *
 * Auto-generates a stable id (`kj-dropdown-menu-label-{n}`); a wrapping
 * `[kjDropdownMenuGroup]` picks it up via `contentChild` and binds
 * `aria-labelledby` on the group host so AT announces the group with the
 * label's text content.
 *
 * `role="presentation"` on the host — the label is heading text, not a
 * focusable item, and the roving navigator skips it.
 *
 * @example
 * ```html
 * <span kjDropdownMenuLabel>Account</span>
 * ```
 * @category Core/Actions
 * @doc
 * @doc-name dropdown-menu
 */
@Directive({
  selector: '[kjDropdownMenuLabel]',
  standalone: true,
  exportAs: 'kjDropdownMenuLabel',
  host: {
    'role': 'presentation',
  },
})
export class KjDropdownMenuLabel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Stable id used by a wrapping `[kjDropdownMenuGroup]` for `aria-labelledby`. */
  readonly id = nextDropdownMenuLabelId();

  constructor() {
    afterNextRender(() => {
      // Don't clobber a consumer-supplied id.
      if (!this.el.nativeElement.id) {
        this.el.nativeElement.id = this.id;
      }
    });
  }
}
