import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import { KjInputGroup, KjInputGroupAddon } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjInputGroup` / `KjInputGroupAddon`
 * directive family. Renders a flex row (or column) where `<kj-input-group-addon>`
 * elements flank a central `[kjInput]`, sharing collapsed borders so the
 * whole widget looks like a single field.
 *
 * All directive inputs (`kjVariant`, `kjSize`, `kjDisabled`, `kjOrientation`)
 * are forwarded to the composed `KjInputGroup` directive.
 *
 * @example
 * ```html
 * <kj-input-group>
 *   <kj-input-group-addon>$</kj-input-group-addon>
 *   <input kjInput type="text" placeholder="Amount" />
 *   <kj-input-group-addon>.00</kj-input-group-addon>
 * </kj-input-group>
 * ```
 * @doc-example Default
 *   Currency prefix and decimal suffix flanking a text input.
 *   @doc-file input-group.example.ts
 * @doc-example Usage
 *   Common input-group shapes — icon prefix, button suffix, and URL slug.
 *   @doc-file input-group.usage.example.ts
 * @doc-example With icon
 *   Decorative icon addon for search and similar affordances.
 *   @doc-file input-group.icon.example.ts
 * @doc-example With button
 *   Inline action button as a suffix (copy, submit, generate, etc.).
 *   @doc-file input-group.button.example.ts
 * @doc-example URL slug
 *   Static base URL prefix paired with an editable slug.
 *   @doc-file input-group.url.example.ts
 * @doc-example Variants
 *   Theme variants forwarded to the composed `KjInputGroup` directive.
 *   @doc-file input-group.variants.example.ts
 *
 * @doc-keyboard
 *   Tab — Moves focus to the inner input. Addons are skipped unless they project a focusable child.
 *
 * @doc-aria
 *   aria-hidden     — Set [kjAriaHidden]="true" on decorative addons (icons, currency symbols, units)
 *   data-position   — Mirrors the addon's resolved "prefix" / "suffix" position
 *   data-disabled   — Mirrors group-level [kjDisabled] for theme CSS
 *
 * @doc-touch
 *   Addons inherit the group's height — keep size ≥ `md` so the inline input
 *   stays at or above the 44 px target when it is the primary touch surface.
 *
 * @doc-a11y
 *   Decorative addons (icons, symbols) must use `[kjAriaHidden]="true"` so AT
 *   does not announce them ahead of the input value. Action addons that wrap a
 *   real `<button>` or `<a>` keep their native semantics; the group never
 *   inserts an extra `role`.
 *
 * @doc-related input,field,button
 *
 * @doc-css-var
 *   --kj-input-group-border-color — Border color shared across input and addons.
 *   --kj-input-group-border-width — Border thickness. Inherits --kj-border.
 *   --kj-input-group-radius       — Outer corner radius of the group. Inherits --kj-radius-field.
 *   --kj-input-group-addon-bg     — Background fill for prefix / suffix addons.
 *   --kj-input-group-addon-fg     — Foreground color inside addons.
 *   --kj-input-group-addon-font   — Font family used inside addons.
 *   --kj-input-group-addon-size   — Font size used inside addons.
 *   --kj-input-group-padding-x    — Horizontal padding inside addons.
 *   --kj-input-group-padding-y    — Vertical padding inside addons.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name input-group
 * @doc-description Themed input with prefix and suffix addons such as icons, units, or buttons.
 * @doc-is-main
 */
@Component({
  selector: 'kj-input-group',
  standalone: true,
  hostDirectives: [
    {
      directive: KjInputGroup,
      inputs: ['kjDisabled', 'kjOrientation'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './input-group.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-input-group' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputGroupComponent {
  /** Layout axis. Forwarded to `KjInputGroup`. @default 'horizontal' */
  readonly kjOrientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Default variant forwarded to the group. */
  readonly kjVariant = input<string | undefined>(undefined);

  /** Default size forwarded to the group. */
  readonly kjSize = input<string | undefined>(undefined);

  /** Group-level disabled. OR-ed with any inner formControl disabled state. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });
}

/**
 * Styled prefix/suffix addon for use inside `<kj-input-group>`.
 *
 * Renders a bordered segment that visually connects to the inner input.
 * Mark decorative addons (icons, symbols) with `[kjAriaHidden]="true"`.
 *
 * @example
 * ```html
 * <kj-input-group>
 *   <kj-input-group-addon>https://</kj-input-group-addon>
 *   <input kjInput type="text" placeholder="example.com" />
 * </kj-input-group>
 * ```
 * @doc
 * @doc-name input-group
 */
@Component({
  selector: 'kj-input-group-addon',
  standalone: true,
  hostDirectives: [
    {
      directive: KjInputGroupAddon,
      inputs: ['kjPosition', 'kjAriaHidden'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-input-group__addon' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputGroupAddonComponent {}
