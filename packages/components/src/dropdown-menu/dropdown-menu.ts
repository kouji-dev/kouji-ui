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
 * @doc-keyboard
 *   Enter|Space    — Opens the menu from the trigger; activates the focused menu item when open
 *   ArrowDown      — Moves focus to the next menu item (roving tabindex)
 *   ArrowUp        — Moves focus to the previous menu item
 *   Home           — Moves focus to the first menu item
 *   End            — Moves focus to the last menu item
 *   Escape         — Closes the menu and returns focus to the trigger (only the topmost overlay receives Escape when nested)
 *   Tab            — Closes the menu and continues focus to the next focusable element
 *
 * @doc-aria
 *   aria-haspopup  — set to "menu" on the trigger button
 *   aria-expanded  — set on the trigger; reflects open/closed state
 *   aria-controls  — links the trigger to the panel id
 *   role="menu"    — on the content panel (provided via KJ_OVERLAY_PANEL_ROLE)
 *   role="menuitem" — on each `[kjDropdownMenuItem]`
 *   data-disabled  — set on items when [kjDisabled] is true (uses ARIA-disabled, not native, so items stay focusable)
 *
 * @doc-css-var
 *   --kj-dropdown-menu-bg                  — Panel background fill. Defaults to --kj-bg-elevated.
 *   --kj-dropdown-menu-fg                  — Panel foreground color. Defaults to --kj-fg-default.
 *   --kj-dropdown-menu-border-color        — Panel border color. Defaults to --kj-border-default.
 *   --kj-dropdown-menu-radius              — Panel corner radius. Inherits --kj-radius-box.
 *   --kj-dropdown-menu-padding             — Inner padding of the panel. Defaults to --kj-space-xs.
 *   --kj-dropdown-menu-shadow              — Box shadow under the panel. Defaults to --kj-shadow-md.
 *   --kj-dropdown-menu-item-padding-x      — Horizontal padding inside each menu item.
 *   --kj-dropdown-menu-item-padding-y      — Vertical padding inside each menu item.
 *   --kj-dropdown-menu-item-min-height     — Minimum row height. 2.75rem keeps WCAG 2.5.5 (44px).
 *   --kj-dropdown-menu-item-radius         — Per-item corner radius. Inherits --kj-radius-field.
 *   --kj-dropdown-menu-item-hover-bg       — Hover background fill for items.
 *   --kj-dropdown-menu-item-active-bg      — Pressed/active background fill for items.
 *   --kj-dropdown-menu-item-current-bg     — Background fill when aria-current is true.
 *   --kj-dropdown-menu-item-current-fg     — Foreground color when aria-current is true.
 *
 * @doc-touch
 *   Menu items enforce `min-height: 2.75rem` (44px) via CSS to meet WCAG 2.5.5 — every item is a valid touch target out of the box, regardless of label length.
 *
 * @doc-a11y
 *   The menu follows the WAI-ARIA Menu pattern. Items use a roving tabindex
 *   inside the panel, so the menu is a single Tab stop. Disabled items use
 *   ARIA-disabled (not the native attribute) and intercept click events in the
 *   capture phase — they remain focusable and discoverable. The panel
 *   portal-mounts to `document.body` by default to escape clipping ancestors;
 *   use `kjMount="inline"` to keep the panel as a sibling of the trigger when
 *   you need it inside a transformed/clipped parent. For context-menu use,
 *   set `kjTrigger="contextmenu"` and `kjMount="point"` to anchor at the pointer
 *   coordinates rather than the trigger element.
 *
 * @doc-related menubar,command-palette,popover
 *
 * @doc
 * @doc-name dropdown-menu
 * @doc-is-main
 * @doc-example Default
 *   A trigger button with a three-row dropdown menu.
 *   @doc-file dropdown-menu.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common dropdown usages — labelled group, a
 *   separator, and a disabled item.
 *   @doc-file dropdown-menu.usage.example.ts
 * @doc-example Sides
 *   `kjPlacement` flips the panel above / below / start / end the trigger.
 *   @doc-file dropdown-menu.sides.example.ts
 * @doc-example With icons
 *   Each item projects a leading icon next to its label.
 *   @doc-file dropdown-menu.with-icons.example.ts
 * @doc-example With separator
 *   Group related items with `[kjDropdownMenuSeparator]` rules.
 *   @doc-file dropdown-menu.with-separator.example.ts
 * @doc-example Shortcuts
 *   Inline `kbd` chips that mirror the global hotkey for each row.
 *   @doc-file dropdown-menu.shortcuts.example.ts
 * @doc-example Disabled
 *   `[kjDisabled]="true"` keeps the item focusable but blocks activation.
 *   @doc-file dropdown-menu.disabled.example.ts
 *
 * @doc-category Library/Overlay
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
