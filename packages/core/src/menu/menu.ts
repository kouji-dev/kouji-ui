import { Directive, ElementRef, inject, signal } from '@angular/core';
import { KJ_MENU, KjMenuContext } from './menu.context';

/**
 * Root menu container. Manages open/close state and provides context to child directives.
 * Pairs with `[kjMenuTrigger]`, `[kjMenuContent]`, and `[kjMenuItem]`.
 *
 * Click outside or Escape closes the menu. Clicking the trigger toggles it.
 * Arrow-key navigation, Home/End, and typeahead are handled by `[kjMenuContent]`.
 *
 * @example
 * ```html
 * <div kjMenu>
 *   <button kjMenuTrigger>Actions</button>
 *   <div kjMenuContent>
 *     <button kjMenuItem>Edit</button>
 *     <button kjMenuItem>Delete</button>
 *   </div>
 * </div>
 * ```
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file menu.example.ts
 * @category Core/Navigation/Menu
 */
@Directive({
  selector: '[kjMenu]',
  standalone: true,
  providers: [{ provide: KJ_MENU, useExisting: KjMenu }],
  exportAs: 'kjMenu',
})
export class KjMenu implements KjMenuContext {
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  toggle(): void { this._open.update(v => !v); }
  close(): void { this._open.set(false); }
}

/**
 * Trigger element that toggles the parent menu.
 * Automatically sets `aria-haspopup` and `aria-expanded` on the host element.
 *
 * @category Core/Navigation/Menu
 */
@Directive({
  selector: '[kjMenuTrigger]',
  standalone: true,
  host: {
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'ctx.open().toString()',
    // stopPropagation prevents the document:click on kjMenuContent from immediately closing
    '(click)': '$event.stopPropagation(); ctx.toggle()',
  },
})
export class KjMenuTrigger {
  readonly ctx = inject(KJ_MENU);
}

/**
 * Menu content panel. Hidden when closed via the `hidden` attribute.
 * Provides keyboard navigation: Arrow keys, Home/End, Escape, and typeahead.
 * Click-outside dismissal is handled via a document-level click listener.
 *
 * @category Core/Navigation/Menu
 */
@Directive({
  selector: '[kjMenuContent]',
  standalone: true,
  host: {
    'role': 'menu',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    // Prevent clicks inside from propagating to document click handler
    '(click)': '$event.stopPropagation()',
    // Keyboard navigation within the menu
    '(keydown)': 'onKeydown($event)',
    // Close on Escape key
    '(document:keydown.escape)': 'ctx.open() && ctx.close()',
    // Close on any click outside (trigger stopPropagation prevents self-close)
    '(document:click)': 'ctx.open() && ctx.close()',
  },
})
export class KjMenuContent {
  private readonly el = inject(ElementRef<HTMLElement>);
  readonly ctx = inject(KJ_MENU);

  onKeydown(e: KeyboardEvent): void {
    const items = this.getFocusableItems();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(current + 1) % items.length].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(current - 1 + items.length) % items.length].focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0].focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1].focus();
        break;
      default: {
        // Type-ahead: jump to next item starting with pressed character
        const char = e.key.length === 1 ? e.key.toLowerCase() : null;
        if (char) {
          const match =
            items.find((item, i) =>
              i > current && item.textContent?.trim().toLowerCase().startsWith(char)
            ) ??
            items.find(item =>
              item.textContent?.trim().toLowerCase().startsWith(char)
            );
          match?.focus();
        }
      }
    }
  }

  private getFocusableItems(): HTMLElement[] {
    const nodes = this.el.nativeElement.querySelectorAll('[kjMenuItem]');
    return (Array.from(nodes) as HTMLElement[]).filter(el => !el.hasAttribute('disabled'));
  }
}

/**
 * Individual menu item. Closes the menu on click or keyboard activation (Enter/Space).
 *
 * @example
 * ```html
 * <button kjMenuItem>Delete</button>
 * ```
 * @category Core/Navigation/Menu
 */
@Directive({
  selector: '[kjMenuItem]',
  standalone: true,
  host: {
    'role': 'menuitem',
    '[attr.tabindex]': '"0"',
    '(click)': 'ctx.close()',
    '(keydown.enter)': '$event.preventDefault(); ctx.close()',
    '(keydown.space)': '$event.preventDefault(); ctx.close()',
  },
})
export class KjMenuItem {
  readonly ctx = inject(KJ_MENU);
}

/**
 * Closes the parent menu when clicked. Convenience directive for non-item close buttons.
 * Place anywhere inside `[kjMenu]`.
 *
 * @example
 * ```html
 * <button kjMenuClose>Cancel</button>
 * ```
 * @category Core/Navigation/Menu
 */
@Directive({
  selector: '[kjMenuClose]',
  standalone: true,
  host: {
    '(click)': 'ctx.close()',
  },
})
export class KjMenuClose {
  readonly ctx = inject(KJ_MENU);
}
