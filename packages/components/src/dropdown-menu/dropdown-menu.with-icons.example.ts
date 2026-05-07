import { Component } from '@angular/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuSeparatorComponent,
  KjDropdownMenuTriggerComponent,
} from './dropdown-menu';
import { KjButtonComponent } from '../button/button';

/**
 * Items with leading decorative glyph icons. Icons are `aria-hidden="true"`
 * so AT announces only the textual label.
 */
@Component({
  selector: 'kj-dropdown-menu-with-icons-example',
  standalone: true,
  imports: [
    KjDropdownMenuTriggerComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjDropdownMenuSeparatorComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 18rem; }
    .kj-dropdown-menu-icons__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.125rem;
      height: 1.125rem;
      flex: 0 0 auto;
      opacity: 0.7;
      font-size: 0.95rem;
      line-height: 1;
    }
  `],
  template: `
    <kj-dropdown-menu-trigger [kjDropdownMenuTriggerFor]="menu">
      <kj-button kjVariant="default">File</kj-button>
    </kj-dropdown-menu-trigger>
    <ng-template #menu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>
          <span class="kj-dropdown-menu-icons__icon" aria-hidden="true">＋</span>
          New project
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          <span class="kj-dropdown-menu-icons__icon" aria-hidden="true">📁</span>
          Open
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-item>
          <span class="kj-dropdown-menu-icons__icon" aria-hidden="true">💾</span>
          Save
        </kj-dropdown-menu-item>
        <kj-dropdown-menu-separator />
        <kj-dropdown-menu-item>
          <span class="kj-dropdown-menu-icons__icon" aria-hidden="true">⏏</span>
          Sign out
        </kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjDropdownMenuWithIconsExample {}
