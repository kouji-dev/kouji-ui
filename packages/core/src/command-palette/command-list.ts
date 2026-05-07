import { Directive, inject } from '@angular/core';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

/**
 * Listbox host for the command palette. Place on the scrollable container
 * that wraps `[kjCommandItem]`s. Sets `role="listbox"` and wires the id
 * used by `[kjCommandInput]`'s `aria-controls`.
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjCommandList]',
  standalone: true,
  host: {
    'role': 'listbox',
    '[id]': 'ctx.listId',
    '[attr.aria-label]': '"Commands"',
  },
})
export class KjCommandList {
  readonly ctx = inject(KJ_COMMAND_PALETTE);
}
