import { Component } from '@angular/core';
import {
  KjMenubarComponent,
  KjMenubarItemComponent,
} from './menubar';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
  KjDropdownMenuTriggerComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * Menubar with a nested submenu.
 *
 * The File menu contains a "Recent" sub-trigger; ArrowRight on that item
 * opens the submenu (does not cross bars — the focused item *has* a
 * submenu). ArrowLeft inside the submenu closes the submenu and returns
 * focus to the parent sub-trigger.
 */
@Component({
  selector: 'kj-menubar-with-submenu-example',
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItemComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
    KjDropdownMenuTriggerComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 22rem; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="editMenu">Edit</kj-menubar-item>
    </kj-menubar>

    <ng-template #fileMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>New file</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Open…</kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="recentMenu" kjSide="right" kjAlign="start">
          <kj-dropdown-menu-item>Open recent</kj-dropdown-menu-item>
        </kj-dropdown-menu-trigger>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>Save</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>

    <ng-template #recentMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>project-a.kouji</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>project-b.kouji</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>project-c.kouji</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>

    <ng-template #editMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Undo</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Redo</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjMenubarWithSubmenuExample {}
