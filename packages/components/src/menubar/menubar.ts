import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  KjMenubar,
  KjMenubarItem,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjMenubar` directive.
 *
 * Renders an inner `<nav kjMenubar>` so theme tokens land on the bar
 * element. The component projects its bar items as content; the bar items
 * themselves use `<kj-menubar-item>` (styled wrapper) or `<button
 * kjMenubarItem>` directly.
 *
 * @doc-example Default
 *   The canonical File / Edit / View bar — the bare-minimum recipe.
 *   @doc-file menubar.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common menubar usages — action items and a
 *   disabled item. Use this as the copy-paste starting point.
 *   @doc-file menubar.usage.example.ts
 * @doc-example With shortcuts
 *   Trailing `<kj-kbd>` hints render aligned to the right of each item label.
 *   @doc-file menubar.with-shortcuts.example.ts
 * @doc-example With submenu
 *   Each bar item discloses a dropdown-menu panel.
 *   @doc-file menubar.with-submenu.example.ts
 * @doc-example Disabled item
 *   `[kjDisabled]="true"` drops the item from the keyboard cycle and dims it.
 *   @doc-file menubar.disabled-item.example.ts
 *
 * @doc-keyboard
 *   ArrowLeft|ArrowRight — Moves focus between menubar items (wraps when [kjLoop]="true")
 *   Home                 — Moves focus to the first menubar item
 *   End                  — Moves focus to the last menubar item
 *   Enter|Space          — Activates the focused item — opens its submenu when it has one
 *   ArrowDown            — Opens the focused item's submenu
 *   Escape               — Closes the open submenu and keeps focus on its bar item
 *   Tab                  — Moves focus out of the bar to the next focusable element
 *
 * @doc-aria
 *   role="menubar"     — On the component host (provided by the composed directive)
 *   role="menuitem"    — On each bar item's `<button>`
 *   aria-label         — Wired from `kjAriaLabel` so AT announces the bar's purpose
 *   aria-orientation   — Reflects horizontal orientation
 *   aria-haspopup      — `"menu"` on every bar item (WAI-ARIA menubar pattern)
 *   aria-expanded      — `"true"` while the item's submenu is open
 *   aria-controls      — Points at the open submenu panel
 *   aria-disabled      — Reflected on items when `kjDisabled` is true
 *   data-state         — `"active"` while the item's submenu is open, for theme hooks
 *
 * @doc-touch
 *   Items use a 2.75rem (44px) min-height by default — meets WCAG 2.5.5 for
 *   touch-first surfaces. Override `--kj-menubar-item-min-height` for denser
 *   keyboard-only desktop chrome.
 *
 * @doc-a11y
 *   Follows the WAI-ARIA menubar pattern: one roving Tab stop for the whole
 *   bar, arrow keys between items, and a submenu that returns focus to its
 *   bar item when it closes. The bar always exposes a programmatic name —
 *   supply `kjAriaLabel` even when a visible heading is nearby. Because every
 *   bar item advertises `aria-haspopup="menu"`, give each one a submenu; a
 *   bar of plain actions belongs in a toolbar, not a menubar.
 *
 * @doc-related dropdown-menu,command-palette,tabs
 *
 * @doc-css-var
 *   --kj-menubar-bg                — Bar background fill. Defaults to --kj-bg-body.
 *   --kj-menubar-fg                — Bar foreground (label) color. Defaults to --kj-fg-default.
 *   --kj-menubar-border-color      — Bar outer border color. Inherits --kj-border-default.
 *   --kj-menubar-radius            — Bar corner radius. Inherits --kj-radius-box.
 *   --kj-menubar-padding           — Inner padding around the item row.
 *   --kj-menubar-gap               — Gap between adjacent menubar items.
 *   --kj-menubar-item-padding-x    — Per-item horizontal padding.
 *   --kj-menubar-item-padding-y    — Per-item vertical padding.
 *   --kj-menubar-item-min-height   — Per-item min height. 2.75rem for WCAG 2.5.5.
 *   --kj-menubar-item-radius       — Per-item corner radius. Inherits --kj-radius-field.
 *   --kj-menubar-item-hover-bg     — Item hover background fill.
 *   --kj-menubar-item-active-bg    — Item background when its menu is open.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name menubar
 * @doc-description Themed desktop-style application menubar with arrow-key navigation and dropdown submenus.
 * @doc-is-main
 */
@Component({
  selector: 'kj-menubar',
  standalone: true,
  // KjMenubar must live on this component's host element (not on an
  // inner `<nav>`) so projected `<kj-menubar-item>` children can
  // resolve KJ_MENUBAR through their declaration-tree element-injector
  // walk. Composing via hostDirectives places the directive — and the
  // KJ_MENUBAR provider — exactly there.
  hostDirectives: [
    {
      directive: KjMenubar,
      inputs: ['kjLoop', 'kjAriaLabel'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './menubar.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-menubar',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarComponent {
  // Inputs (kjLoop, kjAriaLabel)
  // are exposed via the composed `KjMenubar` host directive above.
  // Re-declaring them on this class would register them twice in the
  // component's input metadata, which the docs extractor renders as
  // duplicated rows and which triggers NG0955 (duplicate track keys)
  // when the `@for` walking the inputs uses the input name as its key.
}

/**
 * Styled wrapper around `KjMenubarItem`.
 *
 * Pass `[kjDropdownMenuTriggerFor]` a `TemplateRef` holding a
 * `[kjDropdownMenu]` panel to give the item a submenu. Activating the item
 * (click, Enter, Space or ArrowDown from the bar) renders that template into
 * a body portal anchored under the item; opening a second item closes the
 * first, Escape closes the open one, and either way focus returns to the bar
 * item. The panel owns its own `role="menu"`.
 *
 * ```html
 * <kj-menubar kjAriaLabel="Application">
 *   <kj-menubar-item [kjDropdownMenuTriggerFor]="fileMenu">File</kj-menubar-item>
 * </kj-menubar>
 * <ng-template #fileMenu>
 *   <div kjDropdownMenu>
 *     <button kjDropdownMenuItem>New</button>
 *   </div>
 * </ng-template>
 * ```
 *
 * An item without a submenu still carries `aria-haspopup="menu"` — that is
 * the WAI-ARIA menubar contract for a top-level item — so use a toolbar
 * instead when the bar is a row of plain actions.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name menubar
 */
@Component({
  selector: 'kj-menubar-item',
  standalone: true,
  // `KjMenubarItem` must live on this component's host element, for the same
  // reason `KjMenubar` does one level up: the bar's `KjListNavigator` finds
  // its items with a `contentChildren(KjListItem)` query, and a content query
  // never crosses into a child component's own view. With the directive on an
  // inner `<button>` the bar registered the item through DI (so clicking
  // opened its submenu) while the navigator saw nothing — no roving tab stop,
  // no arrow keys, no skip-disabled. Composing it here puts the `KjListItem`
  // on an element the bar actually projects.
  hostDirectives: [
    {
      directive: KjMenubarItem,
      inputs: ['kjDisabled', 'kjDropdownMenuTriggerFor'],
      outputs: ['kjActivate'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './menubar.css',
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'kj-menubar-item' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarItemComponent {
  // `kjDisabled`, `kjDropdownMenuTriggerFor` and `kjActivate` are exposed
  // through the composed `KjMenubarItem` host directive above. Re-declaring
  // them here would register them twice in the component's binding metadata
  // — duplicated rows in the docs extractor and NG0955 in the `@for` that
  // keys on the input name (same rule as `KjMenubarComponent`).
}
