import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  effect,
  inject,
} from '@angular/core';
import { KjListNavigator } from '../primitives/list';
import { KjCommandPalette } from './command-palette';

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
  protected readonly palette = inject(KjCommandPalette);
  private readonly nav = inject(KjListNavigator);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  constructor() {
    // Reflect the query signal back onto the DOM input. The `(input)` binding
    // is one-way (DOM → signal), so an external reset of `kjQuery` (e.g. the
    // wrapper clearing it when the palette closes) would otherwise leave the
    // previous text visible on reopen. During typing the values already match,
    // so this is a no-op and never disturbs the caret position.
    effect(() => {
      const q = this.palette.query();
      const el = this.el.nativeElement;
      if (el.value !== q) el.value = q;
    });
  }

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
