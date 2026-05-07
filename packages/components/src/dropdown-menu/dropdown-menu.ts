import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjDropdownMenu,
  KjDropdownMenuGroup,
  KjDropdownMenuItem,
  KjDropdownMenuLabel,
  KjDropdownMenuSeparator,
  KjDropdownMenuTrigger,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjDropdownMenuTrigger` directive.
 *
 * Use the standalone `[kjDropdownMenuTriggerFor]` directive on a `<button>`
 * (or `<kj-button>`) inside any template that owns a dropdown trigger. This
 * component itself is a thin host-directive wrapper for consumers that want
 * the `<kj-dropdown-menu-trigger>` element ergonomic — the host renders with
 * `display: contents` so the consumer's trigger element is the actual
 * interactive button.
 *
 * Pair with `<kj-dropdown-menu>` and `<kj-dropdown-menu-item>`s wrapped in
 * an `<ng-template>` and referenced by `[kjDropdownMenuTriggerFor]`.
 *
 * @doc-example Default
 *   @doc-file dropdown-menu.example.ts
 * @doc-example With separator and group
 *   @doc-file dropdown-menu.with-separator.example.ts
 * @doc-example With shortcuts
 *   @doc-file dropdown-menu.shortcuts.example.ts
 * @doc-example Disabled item
 *   @doc-file dropdown-menu.disabled.example.ts
 * @doc-example With icons
 *   @doc-file dropdown-menu.with-icons.example.ts
 * @doc-example Sides
 *   @doc-file dropdown-menu.sides.example.ts
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dropdown-menu-trigger',
  standalone: true,
  hostDirectives: [
    {
      directive: KjDropdownMenuTrigger,
      inputs: [
        'kjDropdownMenuTriggerFor',
        'kjDisabled',
        'kjSide',
        'kjAlign',
        'kjOffset',
        'kjCloseOnSelect',
        'kjOpen',
      ],
      outputs: [
        'kjOpenChange',
        'kjMenuOpened',
        'kjMenuClosed',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './dropdown-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-dropdown-menu-trigger',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuTriggerComponent {}

/**
 * Styled wrapper around the headless `KjDropdownMenu` panel directive.
 *
 * Renders an inner `<div kjDropdownMenu>` so theme tokens land on the panel
 * element itself (the directive moves this element to a body-level container
 * on open). Place inside the `<ng-template>` that the trigger references.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dropdown-menu',
  standalone: true,
  imports: [KjDropdownMenu],
  template: `<div kjDropdownMenu class="kj-dropdown-menu"><ng-content /></div>`,
  styleUrl: './dropdown-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuComponent {}

/**
 * Styled wrapper around `KjDropdownMenuItem`. Renders a real `<button>` so
 * AAA contract (focus + Enter/Space activation) comes from the platform.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dropdown-menu-item',
  standalone: true,
  imports: [KjDropdownMenuItem],
  template: `
    <button
      type="button"
      kjDropdownMenuItem
      class="kj-dropdown-menu-item"
      [kjDisabled]="kjDisabled()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './dropdown-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuItemComponent {
  /** Disable the item. ARIA-disabled, not native. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });
}

/**
 * Styled wrapper around `KjDropdownMenuSeparator`.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dropdown-menu-separator',
  standalone: true,
  hostDirectives: [KjDropdownMenuSeparator],
  template: ``,
  styleUrl: './dropdown-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dropdown-menu-separator' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuSeparatorComponent {}

/**
 * Styled wrapper around `KjDropdownMenuLabel`. A non-interactive heading
 * automatically wired into a wrapping `<kj-dropdown-menu-group>` via
 * `aria-labelledby`.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dropdown-menu-label',
  standalone: true,
  hostDirectives: [KjDropdownMenuLabel],
  template: `<ng-content />`,
  styleUrl: './dropdown-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dropdown-menu-label' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuLabelComponent {}

/**
 * Styled wrapper around `KjDropdownMenuGroup`. A `role="group"` wrapper for
 * a contiguous run of items, optionally introduced by a
 * `<kj-dropdown-menu-label>`.
 *
 * @category Library/Actions
 */
@Component({
  selector: 'kj-dropdown-menu-group',
  standalone: true,
  hostDirectives: [KjDropdownMenuGroup],
  template: `<ng-content />`,
  styleUrl: './dropdown-menu.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-dropdown-menu-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDropdownMenuGroupComponent {}
