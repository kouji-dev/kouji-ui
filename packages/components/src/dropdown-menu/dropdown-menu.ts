import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuLabel,
  KjDropdownMenuGroup,
} from '@kouji-ui/core';

// Re-exports of the new overlay-primitive dropdown-menu API. Absorbs the
// context-menu (use `kjTrigger="contextmenu"`) and inline-menu
// (use `kjMount="inline"`) into a single API surface.
export {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuLabel,
  KjDropdownMenuGroup,
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuContext,
  type KjDropdownMenuTriggerKind,
  type KjDropdownMenuMount,
  type KjDropdownMenuCloseReason,
} from '@kouji-ui/core';

/**
 * Dropdown menu suite. Compose `[kjDropdownMenuTrigger]` + `<kj-dropdown-menu-content [kjFor]="t">`
 * with `[kjDropdownMenuItem]` rows, `[kjDropdownMenuSeparator]` dividers, and
 * `[kjDropdownMenuLabel]` headings. The wrapper itself only projects content —
 * its purpose is to host the documentation page for the suite.
 *
 * @doc-name Dropdown menu
 * @doc-is-main
 * @doc-example Default
 *   @doc-file dropdown-menu.example.ts
 * @doc-example Sides
 *   @doc-file dropdown-menu.sides.example.ts
 * @doc-example With icons
 *   @doc-file dropdown-menu.with-icons.example.ts
 * @doc-example With separator
 *   @doc-file dropdown-menu.with-separator.example.ts
 * @doc-example Shortcuts
 *   @doc-file dropdown-menu.shortcuts.example.ts
 * @doc-example Disabled
 *   @doc-file dropdown-menu.disabled.example.ts
 * @category Library/Overlay
 */
@Component({
  selector: 'kj-dropdown-menu',
  standalone: true,
  imports: [
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
    KjDropdownMenuLabel,
    KjDropdownMenuGroup,
  ],
  template: `<ng-content />`,
  styleUrl: './dropdown-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuComponent {}
