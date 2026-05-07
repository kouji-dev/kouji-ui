import { Component } from '@angular/core';
import {
  KjDropdownMenuComponent,
  KjDropdownMenuItemComponent,
  KjDropdownMenuTriggerComponent,
} from './dropdown-menu';
import { KjButtonComponent } from '../button/button';

/**
 * The same items, anchored on different sides via `kjSide` /
 * `kjAlign` on the trigger. Useful for context-sensitive panels (e.g. a
 * trigger near the viewport edge that should open in the opposite direction).
 */
@Component({
  selector: 'kj-dropdown-menu-sides-example',
  standalone: true,
  imports: [
    KjDropdownMenuTriggerComponent,
    KjDropdownMenuComponent,
    KjDropdownMenuItemComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 22rem; }
    .kj-dropdown-menu-sides__row { display: flex; gap: var(--kj-space-md); flex-wrap: wrap; }
  `],
  template: `
    <div class="kj-dropdown-menu-sides__row">
      <kj-dropdown-menu-trigger
        [kjDropdownMenuTriggerFor]="menu"
        kjSide="bottom"
        kjAlign="start"
      >
        <kj-button kjVariant="default">Bottom-start</kj-button>
      </kj-dropdown-menu-trigger>

      <kj-dropdown-menu-trigger
        [kjDropdownMenuTriggerFor]="menu"
        kjSide="top"
        kjAlign="end"
      >
        <kj-button kjVariant="default">Top-end</kj-button>
      </kj-dropdown-menu-trigger>

      <kj-dropdown-menu-trigger
        [kjDropdownMenuTriggerFor]="menu"
        kjSide="right"
        kjAlign="start"
      >
        <kj-button kjVariant="default">Right-start</kj-button>
      </kj-dropdown-menu-trigger>
    </div>

    <ng-template #menu>
      <kj-dropdown-menu>
        <kj-dropdown-menu-item>One</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Two</kj-dropdown-menu-item>
        <kj-dropdown-menu-item>Three</kj-dropdown-menu-item>
      </kj-dropdown-menu>
    </ng-template>
  `,
})
export class KjDropdownMenuSidesExample {}
