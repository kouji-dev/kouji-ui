import { Component } from '@angular/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
  KjDropdownMenuTriggerComponent,
} from './dropdown-menu';
import { KjButtonComponent } from '../button/button';
import { KjKbdComponent } from '../kbd/kbd';

/**
 * Items with keyboard shortcuts — `<kj-kbd>` carries the shortcut visualisation,
 * tucked to the trailing edge with a flex spacer.
 */
@Component({
  selector: 'kj-dropdown-menu-shortcuts-example',
  standalone: true,
  imports: [
    KjDropdownMenuTriggerComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
    KjButtonComponent,
    KjKbdComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }
    .kj-dropdown-menu-shortcuts__spacer { flex: 1; }
  `],
  template: `
    <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="menu">
      <kj-button kjVariant="default">Edit</kj-button>
    </kj-dropdown-menu-trigger>
    <ng-template #menu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>
          Undo
          <span class="kj-dropdown-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘Z</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Redo
          <span class="kj-dropdown-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⇧⌘Z</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>
          Cut
          <span class="kj-dropdown-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘X</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Copy
          <span class="kj-dropdown-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘C</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Paste
          <span class="kj-dropdown-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘V</kj-kbd>
        </kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjDropdownMenuShortcutsExample {}
