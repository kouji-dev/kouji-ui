import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import { KjButtonGroup, KjButtonGroupOrientation } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjButtonGroup` directive. Renders a
 * visually-joined cluster of `<kj-button>` children: the outer corners stay
 * rounded while inner edges between adjacent buttons collapse to produce the
 * segmented "chunky" look, in either horizontal or vertical orientation.
 *
 * Group-level `kjVariant` / `kjSize` are surfaced through the
 * `KJ_BUTTON_GROUP` context for child buttons that read it as a fallback;
 * children that set their own `kjVariant` / `kjSize` always win. `kjDisabled`
 * on the group OR-s with each child's own disabled state.
 *
 * @example
 * ```html
 * <kj-button-group>
 *   <kj-button>Save</kj-button>
 *   <kj-button>Cancel</kj-button>
 *   <kj-button>Delete</kj-button>
 * </kj-button-group>
 * ```
 * @doc-example Default
 *   @doc-file button-group.example.ts
 * @doc-example Vertical
 *   @doc-file button-group.vertical.example.ts
 * @doc-example Variants
 *   @doc-file button-group.variants.example.ts
 * @doc-example Toggle
 *   @doc-file button-group.toggle.example.ts
 * @doc-example Icon only
 *   @doc-file button-group.icon-only.example.ts
 * @category Library/Actions
 * @doc
 * @doc-name button-group
 * @doc-is-main
 */
@Component({
  selector: 'kj-button-group',
  standalone: true,
  hostDirectives: [
    {
      directive: KjButtonGroup,
      inputs: ['kjOrientation', 'kjVariant', 'kjSize', 'kjDisabled'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './button-group.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-button-group',
    '[attr.aria-label]': 'kjAriaLabel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjButtonGroupComponent {
  /**
   * Layout axis. Forwarded to the composed `KjButtonGroup` directive, which
   * mirrors it to `aria-orientation` / `data-orientation` on the host.
   * @default 'horizontal'
   */
  readonly kjOrientation = input<KjButtonGroupOrientation>('horizontal');

  /**
   * Default variant forwarded to children via `KJ_BUTTON_GROUP`. Children
   * that set their own `kjVariant` override this fallback.
   */
  readonly kjVariant = input<string | undefined>(undefined);

  /**
   * Default size forwarded to children via `KJ_BUTTON_GROUP`. Per-child
   * overrides win.
   */
  readonly kjSize = input<string | undefined>(undefined);

  /**
   * Group-level disabled flag. OR-ed with each child button's own
   * `kjDisabled`.
   */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /**
   * Optional `aria-label` for the host. Useful when the group sits in a
   * toolbar or otherwise needs an accessible name.
   */
  readonly kjAriaLabel = input<string | undefined>(undefined);
}
