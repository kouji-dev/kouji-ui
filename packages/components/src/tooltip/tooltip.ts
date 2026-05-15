import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  KjTooltipTrigger,
  KjTooltipContent,
  KjTooltipArrow,
  KjTooltipGroup,
} from '@kouji-ui/core';

export {
  KjTooltipTrigger,
  KjTooltipContent,
  KjTooltipArrow,
  KjTooltipGroup,
} from '@kouji-ui/core';

/**
 * Tooltip surface styles: `tooltip.css` in this folder. Apps that compose
 * `KjTooltipTrigger` + `kj-tooltip-content` from `@kouji-ui/core` (without this
 * wrapper) must load `packages/components/src/tooltip/tooltip.css` globally
 * (see docs `angular.json` styles) so `.kj-tooltip-content[hidden]{display:none}`
 * and theme tokens apply — same contract as the finance tooltip example.
 *
 * Hover/focus tooltip. Compose `[kjTooltipTrigger]` + `<kj-tooltip-content [kjFor]="t">`
 * for declarative use. The wrapper itself renders only projected content — its
 * purpose is to host the documentation tags for the tooltip suite.
 *
 * @doc
 * @doc-name tooltip
 * @doc-description Themed hover and focus tooltip with placement, delay, group, and rich-content options.
 * @doc-is-main
 * @doc-example Default
 *   The default playground — a trigger and tooltip wired by template ref.
 *   @doc-file tooltip.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common tooltip usages — placement, custom delay,
 *   and a small rich body with secondary info.
 *   @doc-file tooltip.usage.example.ts
 * @doc-example Sides
 *   `kjSide` placement — `top` / `right` / `bottom` / `left`.
 *   @doc-file tooltip.sides.example.ts
 * @doc-example Delays
 *   `[kjOpenDelay]` / `[kjCloseDelay]` tune the hover-intent thresholds.
 *   @doc-file tooltip.delays.example.ts
 * @doc-example Rich content
 *   Project structured content with a heading + body inside the tooltip.
 *   @doc-file tooltip.rich.example.ts
 * @doc-example Disabled
 *   `[kjDisabled]="true"` on the trigger suppresses the tooltip entirely.
 *   @doc-file tooltip.disabled.example.ts
 * @doc-example Grouped
 *   `<kj-tooltip-group>` shares the open delay across nearby triggers, so the
 *   second one opens instantly after the first.
 *   @doc-file tooltip.group.example.ts
 *
 * @doc-keyboard
 *   Tab     — Moves focus onto the trigger; opens the tooltip (no delay on focus)
 *   Escape  — Closes the open tooltip without losing trigger focus
 *   Shift+Tab — Moves focus away; closes the tooltip
 *
 * @doc-aria
 *   role="tooltip"   — applied to `<kj-tooltip-content>` by the directive
 *   aria-describedby — wired from the trigger to the content's id while open
 *   data-state       — "open" | "closed" mirror for CSS targeting on the content
 *   data-side        — Mirrors the resolved placement for theme/arrow hooks
 *
 * @doc-touch
 *   Tooltips are pointer/keyboard-only by contract — touch shouldn't depend
 *   on hover for information. Pair the trigger with a visible label or use
 *   Popover instead when the content is essential on touch.
 *
 * @doc-a11y
 *   Implements the WAI-ARIA Tooltip APG pattern via `aria-describedby` on the
 *   trigger. Hover-intent timing prevents flicker on quick mouse movement.
 *   Escape closes the tooltip per APG. Never put interactive controls inside
 *   the tooltip — use Popover for that.
 *
 * @doc-related popover,dropdown-menu,kbd
 *
 * @doc-css-var
 *   --kj-tooltip-bg            — Background fill of the content panel and arrow.
 *   --kj-tooltip-fg            — Foreground (text) color of the content panel.
 *   --kj-tooltip-border-color  — Border color of the content panel. Default transparent.
 *   --kj-tooltip-radius        — Corner radius. Inherits --kj-radius-selector.
 *   --kj-tooltip-padding-x     — Horizontal padding of the content panel.
 *   --kj-tooltip-padding-y     — Vertical padding of the content panel.
 *   --kj-tooltip-font-size     — Font size of the content text.
 *   --kj-tooltip-shadow        — Elevation shadow on the content panel.
 *   --kj-tooltip-arrow-size    — Edge length of the diamond arrow. Default 6px.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-tooltip',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjTooltipArrow, KjTooltipGroup],
  template: `<ng-content />`,
  styleUrl: './tooltip.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTooltipComponent {}
