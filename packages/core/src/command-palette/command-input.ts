import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { KjListNavigator } from '../primitives/list';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

/**
 * Search input inside the command palette. Composes `KjListNavigator`
 * — `aria-activedescendant` and the APG combobox 1.2 keyboard contract
 * live here, not on the listbox.
 *
 * Keyboard contract:
 * - `ArrowDown` / `ArrowUp` — move active item (handled by `KjListNavigator`)
 * - `Home` / `End` — jump to first/last (handled by `KjListNavigator`)
 * - `Enter` — activate active item (handled by `KjListNavigator`)
 * - `Escape` — first press clears query; second press propagates to dialog
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: 'input[kjCommandInput]',
  standalone: true,
  exportAs: 'kjCommandInput',
  hostDirectives: [KjListNavigator],
  host: {
    'role': 'combobox',
    'autocomplete': 'off',
    'autocorrect': 'off',
    'spellcheck': 'false',
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    '[attr.aria-controls]': 'palette.listId',
    '[attr.aria-expanded]': '"true"',
    '[attr.aria-busy]': 'palette.loading() ? "true" : null',
    '(input)': 'palette.setQuery($any($event.target).value)',
  },
})
export class KjCommandInput implements OnInit, OnDestroy {
  protected readonly palette = inject(KJ_COMMAND_PALETTE);
  private readonly nav = inject(KjListNavigator);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  ngOnInit(): void {
    this.palette._setNavigator(this.nav);
  }

  ngOnDestroy(): void {
    this.palette._setNavigator(null);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // First press: clear query. Second press propagates to the dialog.
      if (this.palette.query()) {
        event.stopPropagation();
        this.palette.setQuery('');
        this.el.nativeElement.value = '';
      }
      // If query is already empty, let the event bubble to KjDialog's Escape handler
    }
  }
}
