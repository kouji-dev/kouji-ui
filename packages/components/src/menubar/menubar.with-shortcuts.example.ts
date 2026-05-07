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
import { KjKbdComponent } from '../kbd/kbd';

/**
 * Menubar with keyboard-shortcut hints. Each `<kj-dropdown-menu-item>` uses
 * a flex spacer + `<kj-kbd>` so the shortcut sits on the trailing edge,
 * matching desktop-OS menubars.
 */
@Component({
  selector: 'kj-menubar-with-shortcuts-example',
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItemComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
    KjKbdComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }
    .kj-menubar-shortcut__spacer { flex: 1; }
  `],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="editMenu">Edit</kj-menubar-item>
    </kj-menubar>

    <ng-template #fileMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>
          New file
          <span class="kj-menubar-shortcut__spacer"></span>
          <kj-kbd kjSize="xs">⌘N</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Open…
          <span class="kj-menubar-shortcut__spacer"></span>
          <kj-kbd kjSize="xs">⌘O</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>
          Save
          <span class="kj-menubar-shortcut__spacer"></span>
          <kj-kbd kjSize="xs">⌘S</kj-kbd>
        </kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>

    <ng-template #editMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>
          Undo
          <span class="kj-menubar-shortcut__spacer"></span>
          <kj-kbd kjSize="xs">⌘Z</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Redo
          <span class="kj-menubar-shortcut__spacer"></span>
          <kj-kbd kjSize="xs">⇧⌘Z</kj-kbd>
        </kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjMenubarWithShortcutsExample {}
