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
 *   The default playground — three joined outline buttons in a row.
 *   @doc-file button-group.example.ts
 * @doc-example Usage
 *   The common shapes — segmented toolbar, vertical stack, and an icon-only
 *   cluster. Use this as the copy-paste starting point.
 *   @doc-file button-group.usage.example.ts
 * @doc-example Vertical
 *   `kjOrientation="vertical"` stacks buttons and joins their top/bottom edges.
 *   @doc-file button-group.vertical.example.ts
 * @doc-example Variants
 *   Set `kjVariant` on the group to cascade onto every child button.
 *   @doc-file button-group.variants.example.ts
 * @doc-example Toggle
 *   Pair with `[kjPressed]` on each child to build a segmented control.
 *   @doc-file button-group.toggle.example.ts
 * @doc-example Icon only
 *   Pure-icon children — give each an `kjAriaLabel` for AT users.
 *   @doc-file button-group.icon-only.example.ts
 *
 * @doc-keyboard
 *   Tab           — Moves focus through each button in DOM order
 *   Enter|Space   — Activates the focused button (native click)
 *
 * @doc-aria
 *   role               — `group` on the host (set by `KjButtonGroup` directive)
 *   aria-label         — Override via `kjAriaLabel` for toolbars without surrounding context
 *   aria-orientation   — Mirrors `kjOrientation` for AT
 *   data-orientation   — Mirrors `kjOrientation` for theme/scope hooks
 *
 * @doc-touch
 *   Children inherit `<kj-button>` sizing rules — `lg` and `icon` sizes clear
 *   WCAG 2.5.5 ≥ 44×44 by default. For high-density toolbars on touch, raise
 *   the children to `lg` or pad the host.
 *
 * @doc-a11y
 *   Renders a `role="group"` so AT announces "group, 3 buttons" instead of
 *   listing each independently. Set `kjAriaLabel` for toolbars that lack a
 *   surrounding labelled landmark. `kjDisabled` on the group OR-s with each
 *   child's own disabled state.
 *
 * @doc-related button,toggle,tabs
 *
 * @doc-css-var
 *   --kj-button-group-gap  — Gap between adjacent buttons. Defaults to 0 (segmented look); raise for a spaced cluster.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name button-group
 * @doc-description Themed segmented button cluster that joins adjacent buttons into a single toolbar.
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
