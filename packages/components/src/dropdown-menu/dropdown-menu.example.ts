import { Component } from '@angular/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuTriggerComponent,
} from './dropdown-menu';
import { KjButtonComponent } from '../button/button';

/**
 * Default dropdown menu — three items.
 *
 * Click "Actions" to open. Use Arrow keys to navigate, Enter / Space to
 * activate, Escape to close. Focus returns to the trigger on close.
 */
@Component({
  selector: 'kj-dropdown-menu-example',
  standalone: true,
  imports: [
    KjDropdownMenuTriggerComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 16rem; }`],
  template: `
    <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="menu">
      <kj-button kjVariant="default">Actions</kj-button>
    </kj-dropdown-menu-trigger>
    <ng-template #menu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Edit</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Duplicate</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Delete</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjDropdownMenuExample {}
