import { Directive, inject } from '@angular/core';
import { KjCommandPalette } from './command-palette';
import { KjTranslateService } from '../i18n/translate.service';

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
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class KjCommandList {
  /**
   * Accessible name of the command listbox, from the i18n catalog
   * (`commandPalette.list`) — cust F-7: no assistive string is baked into this
   * directive's host block.
   */
  protected readonly ariaLabel = inject(KjTranslateService).translation('commandPalette.list');

  /** @internal — for the [id] host binding. */
  protected readonly palette = inject(KjCommandPalette);
}
