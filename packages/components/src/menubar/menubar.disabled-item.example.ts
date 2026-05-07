import { Component } from '@angular/core';
import {
  KjMenubarComponent,
  KjMenubarItemComponent,
} from './menubar';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * Menubar with a disabled top-level item.
 *
 * The disabled `Help` item is skipped by ArrowLeft / ArrowRight but still
 * announced by AT — "Help menu, disabled, has popup". The popup never
 * opens because the trigger refuses while `kjDisabled` is true.
 */
@Component({
  selector: 'kj-menubar-disabled-item-example',
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItemComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="editMenu">Edit</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="helpMenu" kjDisabled>Help</kj-menubar-item>
    </kj-menubar>

    <ng-template #fileMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>New file</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Open…</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>

    <ng-template #editMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Undo</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Redo</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>

    <ng-template #helpMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Documentation</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjMenubarDisabledItemExample {}
