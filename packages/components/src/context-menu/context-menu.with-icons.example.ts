import { Component } from '@angular/core';
import { KjContextMenuTrigger } from '@kouji-ui/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * Items with leading decorative glyph icons. Icons are `aria-hidden="true"`
 * so AT announces only the textual label.
 */
@Component({
  selector: 'kj-context-menu-with-icons-example',
  standalone: true,
  imports: [
    KjContextMenuTrigger,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }
    .kj-context-menu-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--kj-space-md);
      padding: var(--kj-space-md) var(--kj-space-lg);
      background: var(--kj-color-base-100);
      border: var(--kj-border) solid var(--kj-color-base-300);
      border-radius: var(--kj-radius-field);
      max-width: 26rem;
      cursor: context-menu;
      user-select: none;
    }
    .kj-context-menu-row:focus-visible {
      outline: 2px solid var(--kj-color-primary);
      outline-offset: 2px;
    }
    .kj-context-menu-icons__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.125rem;
      height: 1.125rem;
      flex: 0 0 auto;
      opacity: 0.7;
      font-size: 0.95rem;
      line-height: 1;
    }
  `],
  template: `
    <div class="kj-context-menu-row" tabindex="0" [kjContextMenuFor]="fileMenu">
      <span>budget.xlsx</span>
      <span aria-hidden="true">↗</span>
    </div>
    <ng-template #fileMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>
          <span class="kj-context-menu-icons__icon" aria-hidden="true">📂</span>
          Open
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          <span class="kj-context-menu-icons__icon" aria-hidden="true">✎</span>
          Rename
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          <span class="kj-context-menu-icons__icon" aria-hidden="true">⎘</span>
          Duplicate
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>
          <span class="kj-context-menu-icons__icon" aria-hidden="true">🗑</span>
          Delete
        </kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjContextMenuWithIconsExample {}
