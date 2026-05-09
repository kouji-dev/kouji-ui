import {
  Directive,
  ElementRef,
  HostListener,
  computed,
  inject,
} from '@angular/core';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

/**
 * Search input for the command palette. Place on an `<input>` element inside
 * the palette. Wires the combobox ARIA pattern: `role="combobox"`,
 * `aria-controls` → listbox, `aria-activedescendant` → active item.
 *
 * Keyboard contract:
 * - `ArrowDown` / `ArrowUp` — move active item
 * - `Home` / `End` — jump to first/last
 * - `Enter` — activate active item
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
  host: {
    'role': 'combobox',
    'aria-expanded': 'true',
    '[attr.aria-controls]': 'ctx.listId',
    '[attr.aria-activedescendant]': 'activeItemId()',
    'aria-autocomplete': 'list',
    'aria-haspopup': 'listbox',
    'autocomplete': 'off',
    'autocorrect': 'off',
    'spellcheck': 'false',
    '(input)': 'onInput($event)',
  },
})
export class KjCommandInput {
  readonly ctx = inject(KJ_COMMAND_PALETTE);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** The id of the currently active item, used for `aria-activedescendant`. */
  readonly activeItemId = computed(() => {
    const activeVal = this.ctx.activeValue();
    const item = this.ctx.visibleItems().find(i => i.value === activeVal);
    return item?.id ?? null;
  });

  onInput(event: Event): void {
    this.ctx.setQuery((event.target as HTMLInputElement).value);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.ctx.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.ctx.moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.ctx.setActiveTo('first');
        break;
      case 'End':
        event.preventDefault();
        this.ctx.setActiveTo('last');
        break;
      case 'Enter': {
        event.preventDefault();
        const activeVal = this.ctx.activeValue();
        if (activeVal !== null && activeVal !== undefined) {
          this.ctx.activate(activeVal);
        }
        break;
      }
      case 'Escape': {
        // First press: clear query. Second press propagates to the dialog.
        if (this.ctx.query()) {
          event.stopPropagation();
          this.ctx.setQuery('');
          this.el.nativeElement.value = '';
        }
        // If query is already empty, let the event bubble to KjDialog's Escape handler
        break;
      }
    }
  }
}
