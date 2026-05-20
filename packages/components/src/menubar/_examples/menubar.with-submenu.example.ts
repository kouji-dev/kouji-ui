import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjMenubarComponent } from '../menubar';
import { KjDropdownMenuContent } from '../../dropdown-menu/dropdown-menu';
import {
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuTrigger,
  KjMenubarItem,
} from '@kouji-ui/core';

/**
 * Menubar with nested submenus. Each item is a raw
 * `<button kjMenubarItem kjDropdownMenuTrigger>` that composes the menubar
 * item with the dropdown-menu trigger — activating the item opens the
 * paired `<kj-dropdown-menu-content [kjFor]="…">` panel, which is portalled
 * to `<body>` and anchored to the trigger.
 */
@Component({
  selector: 'kj-menubar-with-submenu-example',
  standalone: true,
  imports: [
    KjMenubarComponent,
    KjMenubarItem,
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-menubar kjAriaLabel="Application">
      <button
        kjMenubarItem
        kjDropdownMenuTrigger
        #fileT="kjDropdownMenuTrigger"
        class="kj-menubar-item"
      >File</button>
      <kj-dropdown-menu-content [kjFor]="fileT" kjSide="bottom" kjAlign="start">
        <button kjDropdownMenuItem>New</button>
        <button kjDropdownMenuItem>Open…</button>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem>Save</button>
        <button kjDropdownMenuItem>Save As…</button>
      </kj-dropdown-menu-content>

      <button
        kjMenubarItem
        kjDropdownMenuTrigger
        #editT="kjDropdownMenuTrigger"
        class="kj-menubar-item"
      >Edit</button>
      <kj-dropdown-menu-content [kjFor]="editT" kjSide="bottom" kjAlign="start">
        <button kjDropdownMenuItem>Undo</button>
        <button kjDropdownMenuItem>Redo</button>
        <hr kjDropdownMenuSeparator />
        <button kjDropdownMenuItem>Cut</button>
        <button kjDropdownMenuItem>Copy</button>
        <button kjDropdownMenuItem>Paste</button>
      </kj-dropdown-menu-content>

      <button
        kjMenubarItem
        kjDropdownMenuTrigger
        #viewT="kjDropdownMenuTrigger"
        class="kj-menubar-item"
      >View</button>
      <kj-dropdown-menu-content [kjFor]="viewT" kjSide="bottom" kjAlign="start">
        <button kjDropdownMenuItem>Zoom in</button>
        <button kjDropdownMenuItem>Zoom out</button>
        <button kjDropdownMenuItem>Reset zoom</button>
      </kj-dropdown-menu-content>
    </kj-menubar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarWithSubmenuExample {}
