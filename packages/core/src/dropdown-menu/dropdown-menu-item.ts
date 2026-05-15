import {
  Directive,
  inject,
  output,
} from '@angular/core';
import { KjListItem, injectListItem } from '../primitives/list';

/**
 * An individual item inside a `[kjDropdownMenu]` panel.
 *
 * Apply on a `<button>`. Sets `role="menuitem"` and composes `KjListItem`
 * for id, value, label, disabled state, click + Enter/Space activation,
 * `aria-disabled`, and (via the surrounding `KjListNavigator` in roving
 * mode) `tabindex` driven by the active-item state.
 *
 * Activation flows through `KjListItem._activate` → root config's
 * `afterSelect` hook → overlay close. This directive only contributes
 * `role="menuitem"`, the `kj-dropdown-menu-item` class, the `kj*` input
 * aliases, and re-emits the composed `activate` output as `kjSelect`.
 *
 * @doc-category Core/Overlay
 */
@Directive({
  selector: '[kjDropdownMenuItem]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: [
        'kjItemLabel:kjLabel',
        'kjShortcut:kjShortcut',
        'kjDisabled:kjDisabled',
      ],
    },
  ],
  host: {
    'class': 'kj-dropdown-menu-item',
    'role': 'menuitem',
  },
})
export class KjDropdownMenuItem {
  private readonly item = injectListItem<unknown>();

  /** Emitted when the item is activated (click / Enter / Space). */
  readonly kjSelect = output<void>();

  constructor() {
    // Forward the primitive's activation output so consumers can keep
    // listening to `(kjSelect)` exactly as before.
    this.item.activate.subscribe(() => this.kjSelect.emit());
  }
}
