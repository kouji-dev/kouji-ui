import { Component } from '@angular/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuTriggerComponent,
} from './dropdown-menu';
import { KjButtonComponent } from '../button/button';

/**
 * One disabled item — focus reaches it via type-ahead and announces it as
 * disabled, but Enter / Space and click do not activate.
 */
@Component({
  selector: 'kj-dropdown-menu-disabled-example',
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
        <kj-dropdown-menu-item>Open</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Rename</kj-dropdown-menu-item>
        <kj-dropdown-menu-item kjDisabled>Archive (read-only project)</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Delete</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjDropdownMenuDisabledExample {}
