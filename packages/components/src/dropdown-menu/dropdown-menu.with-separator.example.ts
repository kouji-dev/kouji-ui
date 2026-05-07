import { Component } from '@angular/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuGroupComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuLabelComponent,
  KjDropdownMenuSeparatorComponent,
  KjDropdownMenuTriggerComponent,
} from './dropdown-menu';
import { KjButtonComponent } from '../button/button';

/**
 * Grouped dropdown — labels announce each section, a separator divides them.
 */
@Component({
  selector: 'kj-dropdown-menu-with-separator-example',
  standalone: true,
  imports: [
    KjDropdownMenuTriggerComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
    KjDropdownMenuLabelComponent,
    KjDropdownMenuGroupComponent,
    KjButtonComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 20rem; }`],
  template: `
    <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="menu">
      <kj-button kjVariant="default">Account</kj-button>
    </kj-dropdown-menu-trigger>
    <ng-template #menu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-group>
          <kj-dropdown-menu-label>Account</kj-dropdown-menu-label>
          <kj-dropdown-menu-item>Profile</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Settings</kj-dropdown-menu-item>
        </kj-dropdown-menu-group>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-group>
          <kj-dropdown-menu-label>Workspace</kj-dropdown-menu-label>
          <kj-dropdown-menu-item>Switch workspace</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Invite team</kj-dropdown-menu-item>
        </kj-dropdown-menu-group>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>Sign out</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjDropdownMenuWithSeparatorExample {}
