import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
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
 *   @doc-file menubar.example.ts
 * @doc-example With shortcuts
 *   @doc-file menubar.with-shortcuts.example.ts
 * @doc-example With submenu
 *   @doc-file menubar.with-submenu.example.ts
 * @doc-example Disabled item
 *   @doc-file menubar.disabled-item.example.ts
 * @category Library/Navigation
 * @doc
 * @doc-name menubar
 * @doc-description Pre-styled application menubar with horizontal arrow-key navigation, auto-disclosure on adjacent hover, and dropdown sub-menus — wraps the headless `KjMenubar` directive for a native desktop-style menu experience.
 * @doc-is-main
 */
@Component({
  selector: 'kj-menubar',
  standalone: true,
  imports: [KjMenubar],
  template: `
    <nav
      kjMenubar
      class="kj-menubar"
      [kjLoop]="kjLoop()"
      [kjAutoDisclose]="kjAutoDisclose()"
      [kjAutoDiscloseDelayMs]="kjAutoDiscloseDelayMs()"
      [kjAriaLabel]="kjAriaLabel()"
    >
      <ng-content />
    </nav>
  `,
  styleUrl: './menubar.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
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
 * the `[kjMenubarItem]` directive applied — the directive composes
 * `[kjDropdownMenuTriggerFor]`, so the consumer forwards the popup
 * template via `kjDropdownMenuTriggerFor`.
 *
 * @category Library/Navigation
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
      [kjDropdownMenuTriggerFor]="kjDropdownMenuTriggerFor()"
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
  readonly kjDropdownMenuTriggerFor = input.required<TemplateRef<unknown>>();
  readonly kjDisabled = input(false, { transform: booleanAttribute });
}
