import { Component } from '@angular/core';
import { KjContextMenuTrigger } from '@kouji-ui/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * Default context menu — right-click anywhere on the card to open. Use Arrow
 * keys to navigate, Enter / Space to activate, Escape to close. The card has
 * `tabindex="0"` so it can also be opened from the keyboard with `Shift+F10`
 * or the `ContextMenu` key.
 */
@Component({
  selector: 'kj-context-menu-example',
  standalone: true,
  imports: [
    KjContextMenuTrigger,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }
    .kj-context-menu-card {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-xs);
      padding: var(--kj-space-lg);
      background: var(--kj-color-base-100);
      border: var(--kj-border) solid var(--kj-color-base-300);
      border-radius: var(--kj-radius-box);
      max-width: 22rem;
      cursor: context-menu;
      user-select: none;
    }
    .kj-context-menu-card:focus-visible {
      outline: 2px solid var(--kj-color-primary);
      outline-offset: 2px;
    }
    .kj-context-menu-card__title { font-weight: 600; }
    .kj-context-menu-card__hint { font-size: 0.8125rem; opacity: 0.7; }
  `],
  template: `
    <article
      class="kj-context-menu-card"
      tabindex="0"
      [kjContextMenuFor]="cardMenu"
    >
      <span class="kj-context-menu-card__title">Quarterly review.pdf</span>
      <span class="kj-context-menu-card__hint">Right-click (or press Shift+F10) to open the menu.</span>
    </article>
    <ng-template #cardMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Open</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Rename</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Duplicate</kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>Delete</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjContextMenuExample {}
