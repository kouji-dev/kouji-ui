import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjDropdownMenu, KjDropdownMenuItem, KjDropdownMenuSeparator } from '@kouji-ui/core';
import { KjMenubarComponent, KjMenubarItemComponent } from '../menubar';

/**
 * Menubar with nested submenus — the shape a desktop-style application menu
 * actually takes.
 *
 * Each item points `[kjDropdownMenuTriggerFor]` at an `<ng-template>` holding a
 * `[kjDropdownMenu]` panel. Activating the item (click, Enter, Space, or
 * ArrowDown / ArrowUp while it has focus) portals that panel to `<body>` and
 * anchors it under the item. Opening another item closes the first, Escape
 * closes the open one, and focus returns to the bar item either way.
 */
@Component({
  selector: 'kj-menubar-with-submenu-example',
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItemComponent,
    KjDropdownMenu,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="editMenu">Edit</kj-menubar-item>
      <kj-menubar-item [kjDropdownMenuTriggerFor]="viewMenu">View</kj-menubar-item>
    </kj-menubar>

    <ng-template #fileMenu>
      <div kjDropdownMenu>
        <button kjDropdownMenuItem>New</button>
        <button kjDropdownMenuItem>Open…</button>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem>Save</button>
        <button kjDropdownMenuItem>Save As…</button>
      </div>
    </ng-template>

    <ng-template #editMenu>
      <div kjDropdownMenu>
        <button kjDropdownMenuItem>Undo</button>
        <button kjDropdownMenuItem>Redo</button>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem>Cut</button>
        <button kjDropdownMenuItem>Copy</button>
        <button kjDropdownMenuItem>Paste</button>
      </div>
    </ng-template>

    <ng-template #viewMenu>
      <div kjDropdownMenu>
        <button kjDropdownMenuItem>Zoom in</button>
        <button kjDropdownMenuItem>Zoom out</button>
        <button kjDropdownMenuItem>Reset zoom</button>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarWithSubmenuExample {}
