import { Component } from '@angular/core';
import { KjContextMenuTrigger } from '@kouji-ui/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';
import { KjKbdComponent } from '../kbd/kbd';

/**
 * Items with keyboard shortcuts — `<kj-kbd>` carries the shortcut visualisation,
 * tucked to the trailing edge with a flex spacer.
 */
@Component({
  selector: 'kj-context-menu-with-shortcuts-example',
  standalone: true,
  imports: [
    KjContextMenuTrigger,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
    KjKbdComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }
    .kj-context-menu-canvas {
      display: grid;
      place-items: center;
      padding: var(--kj-space-2xl);
      background: var(--kj-color-base-100);
      border: var(--kj-border) dashed var(--kj-color-base-300);
      border-radius: var(--kj-radius-box);
      min-height: 12rem;
      cursor: context-menu;
      user-select: none;
      color: var(--kj-color-base-content);
      font-size: 0.875rem;
      opacity: 0.85;
    }
    .kj-context-menu-canvas:focus-visible {
      outline: 2px solid var(--kj-color-primary);
      outline-offset: 2px;
    }
    .kj-context-menu-shortcuts__spacer { flex: 1; }
  `],
  template: `
    <div class="kj-context-menu-canvas" tabindex="0" [kjContextMenuFor]="editMenu">
      Right-click on the canvas
    </div>
    <ng-template #editMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>
          Undo
          <span class="kj-context-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘Z</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Redo
          <span class="kj-context-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⇧⌘Z</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>
          Cut
          <span class="kj-context-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘X</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Copy
          <span class="kj-context-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘C</kj-kbd>
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          Paste
          <span class="kj-context-menu-shortcuts__spacer"></span>
          <kj-kbd kjSize="xs">⌘V</kj-kbd>
        </kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjContextMenuWithShortcutsExample {}
