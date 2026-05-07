import { Component } from '@angular/core';
import { KjContextMenuTrigger } from '@kouji-ui/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * One disabled item — focus reaches it via type-ahead and announces it as
 * disabled, but Enter / Space and click do not activate.
 */
@Component({
  selector: 'kj-context-menu-disabled-item-example',
  standalone: true,
  imports: [
    KjContextMenuTrigger,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }
    .kj-context-menu-list-item {
      display: flex;
      align-items: center;
      gap: var(--kj-space-md);
      padding: var(--kj-space-md) var(--kj-space-lg);
      background: var(--kj-color-base-100);
      border: var(--kj-border) solid var(--kj-color-base-300);
      border-radius: var(--kj-radius-field);
      max-width: 26rem;
      cursor: context-menu;
      user-select: none;
    }
    .kj-context-menu-list-item:focus-visible {
      outline: 2px solid var(--kj-color-primary);
      outline-offset: 2px;
    }
    .kj-context-menu-list-item__badge {
      font-size: 0.75rem;
      padding: 0 var(--kj-space-sm);
      border-radius: var(--kj-radius-field);
      background: var(--kj-color-base-300);
    }
  `],
  template: `
    <div class="kj-context-menu-list-item" tabindex="0" [kjContextMenuFor]="rowMenu">
      <span>Read-only project</span>
      <span class="kj-context-menu-list-item__badge" aria-hidden="true">read-only</span>
    </div>
    <ng-template #rowMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Open</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Rename</kj-dropdown-menu-item>
        <kj-dropdown-menu-item kjDisabled>Archive</kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item kjDisabled>Delete</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjContextMenuDisabledItemExample {}
