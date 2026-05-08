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
 *   @doc-file input-group.example.ts
 * @doc-example With icon
 *   @doc-file input-group.icon.example.ts
 * @doc-example With button
 *   @doc-file input-group.button.example.ts
 * @doc-example URL slug
 *   @doc-file input-group.url.example.ts
 * @doc-example Variants
 *   @doc-file input-group.variants.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name input-group
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
