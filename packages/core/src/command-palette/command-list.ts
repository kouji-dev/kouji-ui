import { Directive, inject } from '@angular/core';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

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
  protected readonly palette = inject(KJ_COMMAND_PALETTE);
}
