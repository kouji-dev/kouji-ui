import { Component } from '@angular/core';
import {
  KjMenubarComponent,
  KjMenubarItemComponent,
} from './menubar';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * Default menubar — the canonical File / Edit / View arrangement.
 *
 * Click a bar item to open its popup; ArrowLeft / ArrowRight move between
 * bar items; ArrowDown opens a popup with focus on the first item; Esc
 * closes and restores focus to the bar item.
 */
@Component({
  selector: 'kj-menubar-example',
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItemComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="editMenu">Edit</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="viewMenu">View</kj-menubar-item>
    </kj-menubar>

    <ng-template #fileMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>New file</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Open…</kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>Save</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Save as…</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>

    <ng-template #editMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Undo</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Redo</kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>Cut</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Copy</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Paste</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>

    <ng-template #viewMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>Zoom in</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Zoom out</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Reset zoom</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjMenubarExample {}
