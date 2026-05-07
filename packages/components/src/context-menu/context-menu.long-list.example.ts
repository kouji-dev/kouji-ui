import { Component } from '@angular/core';
import { KjContextMenuTrigger } from '@kouji-ui/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuLabelComponent,
  KjDropdownMenuGroupComponent,
  KjDropdownMenuSeparatorComponent,
} from '../dropdown-menu/dropdown-menu';

/**
 * A long, grouped context menu — the panel scrolls at the viewport edge and
 * type-ahead jumps to the first matching item.
 */
@Component({
  selector: 'kj-context-menu-long-list-example',
  standalone: true,
  imports: [
    KjContextMenuTrigger,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuLabelComponent,
    KjDropdownMenuGroupComponent,
    KjDropdownMenuSeparatorComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 22rem; }
    .kj-context-menu-target {
      display: grid;
      place-items: center;
      padding: var(--kj-space-2xl);
      background: var(--kj-color-base-100);
      border: var(--kj-border) solid var(--kj-color-base-300);
      border-radius: var(--kj-radius-box);
      max-width: 28rem;
      min-height: 12rem;
      cursor: context-menu;
      user-select: none;
    }
    .kj-context-menu-target:focus-visible {
      outline: 2px solid var(--kj-color-primary);
      outline-offset: 2px;
    }
  `],
  template: `
    <div class="kj-context-menu-target" tabindex="0" [kjContextMenuFor]="bigMenu">
      Right-click for the full menu
    </div>
    <ng-template #bigMenu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-group>
          <kj-dropdown-menu-label>File</kj-dropdown-menu-label>
          <kj-dropdown-menu-item>New</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Open</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Open recent</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Save</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Save as…</kj-dropdown-menu-item>
        </kj-dropdown-menu-group>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-group>
          <kj-dropdown-menu-label>Edit</kj-dropdown-menu-label>
          <kj-dropdown-menu-item>Undo</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Redo</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Cut</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Copy</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Paste</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Find…</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Replace…</kj-dropdown-menu-item>
        </kj-dropdown-menu-group>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-group>
          <kj-dropdown-menu-label>View</kj-dropdown-menu-label>
          <kj-dropdown-menu-item>Zoom in</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Zoom out</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Reset zoom</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Toggle sidebar</kj-dropdown-menu-item>
          <kj-dropdown-menu-item>Toggle full screen</kj-dropdown-menu-item>
        </kj-dropdown-menu-group>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>Settings…</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjContextMenuLongListExample {}
