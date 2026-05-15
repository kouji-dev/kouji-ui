import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
  numberAttribute,
} from '@angular/core';
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
 *   Nested submenu trigger pattern (pending overlay-migration follow-up).
 *   @doc-file menubar.with-submenu.example.ts
 * @doc-example Disabled item
 *   `[kjDisabled]="true"` drops the item from the keyboard cycle and dims it.
 *   @doc-file menubar.disabled-item.example.ts
 *
 * @doc-keyboard
 *   ArrowLeft|ArrowRight — Moves focus between menubar items (wraps when [kjLoop]="true")
 *   Home                 — Moves focus to the first menubar item
 *   End                  — Moves focus to the last menubar item
 *   Enter|Space          — Activates the focused item
 *   Tab                  — Moves focus out of the bar to the next focusable element
 *
 * @doc-aria
 *   role="menubar"     — On the host `<nav>` (provided by the directive)
 *   aria-label         — Wired from `kjAriaLabel` so AT announces the bar's purpose
 *   aria-orientation   — Reflects horizontal orientation
 *   aria-disabled      — Reflected on items when `kjDisabled` is true
 *   data-active        — Mirrors the active/open state for theme hooks
 *
 * @doc-touch
 *   Items use a 2.75rem (44px) min-height by default — meets WCAG 2.5.5 for
 *   touch-first surfaces. Override `--kj-menubar-item-min-height` for denser
 *   keyboard-only desktop chrome.
 *
 * @doc-a11y
 *   Follows the WAI-ARIA menubar pattern. Focus cycles left/right within the
 *   bar; submenu disclosure is opt-in via `kjAutoDisclose`. The bar always
 *   exposes a programmatic name — supply `kjAriaLabel` even when a visible
 *   heading is nearby.
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
      inputs: [
        'kjLoop',
        'kjAutoDisclose',
        'kjAutoDiscloseDelayMs',
        'kjAriaLabel',
      ],
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
  readonly kjLoop = input(false, { transform: booleanAttribute });
  readonly kjAutoDisclose = input(true, { transform: booleanAttribute });
  readonly kjAutoDiscloseDelayMs = input(0, { transform: numberAttribute });
  readonly kjAriaLabel = input<string>('Application');
}

/**
 * Styled wrapper around `KjMenubarItem`. Renders a real `<button>` with
 * the `[kjMenubarItem]` directive applied.
 *
 * TODO: menubar+dropdown-menu wiring pending overlay-migration follow-up.
 * In this version, menubar items are plain action buttons without submenu
 * support. Submenu wiring will be reintroduced via the new dropdown-menu
 * API (`<kj-dropdown-menu-content [kjFor]="t">` on the panel side).
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name menubar
 */
@Component({
  selector: 'kj-menubar-item',
  standalone: true,
  imports: [KjMenubarItem],
  template: `
    <button
      type="button"
      kjMenubarItem
      class="kj-menubar-item"
      [kjDisabled]="kjDisabled()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './menubar.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjMenubarItemComponent {
  readonly kjDisabled = input(false, { transform: booleanAttribute });
}
