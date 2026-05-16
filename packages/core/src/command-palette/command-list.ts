import { Directive, inject } from '@angular/core';
import { KjCommandPalette } from './command-palette';

/**
 * Listbox panel for the command palette. Role-only — keyboard nav
 * lives on `KjCommandInput` per APG combobox 1.2.
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandList]',
  standalone: true,
  host: {
    'role': 'listbox',
    '[id]': 'palette.listId',
    'class': 'kj-command-list',
    '[attr.aria-label]': '"Commands"',
  },
})
export class KjCommandList {
  /** @internal — for the [id] host binding. */
  protected readonly palette = inject(KjCommandPalette);
}
