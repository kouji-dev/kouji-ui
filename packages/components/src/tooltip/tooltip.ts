/* CSS DELIVERY — no `styleUrl` in this file, on purpose.
 *
 * `tooltip.css` reaches the document exactly once, through
 * `src/overlay/overlay.css`, which every consumer registers (see that
 * file's header and the Getting Started page). It has to be a registered
 * global sheet because the panels are rendered by HEADLESS `@kouji-ui/core`
 * directives, which carry no styles and are usable with no wrapper
 * component on the page at all.
 *
 * These components used to `styleUrl` the same file as well. Under
 * `ViewEncapsulation.None` that adds nothing to the cascade — same rules,
 * same layer — it just ships the bytes a second time inside the component
 * chunk (styles F-21 / lazy F-5). `overlay-styles.spec.ts` fails if a
 * `styleUrl` comes back.
 */
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
 *   Tab     — Moves focus onto the trigger; opens the tooltip immediately (`:focus-visible`, no hover delay)
 *   Escape  — Closes the open tooltip without losing trigger focus
 *   Shift+Tab — Moves focus away; closes the tooltip
 *
 * @doc-aria
 *   role="tooltip"   — applied to `<kj-tooltip-content>` by the directive
 *   aria-describedby — the trigger references the content's id at all times, so the description is available the moment focus lands (WAI-ARIA tooltip pattern)
 *   data-state       — "open" | "closed" mirror for CSS targeting on the content
 *   data-side        — Mirrors the resolved placement for theme/arrow hooks
 *
 * @doc-touch
 *   Tooltips are pointer/keyboard-only by contract — touch shouldn't depend
 *   on hover for information. Pair the trigger with a visible label or use
 *   Popover instead when the content is essential on touch.
 *
 * @doc-a11y
 *   Implements the WAI-ARIA Tooltip APG pattern: the trigger opens on hover
 *   intent and on keyboard focus (`:focus-visible`), is described by the
 *   tooltip via `aria-describedby`, and Escape dismisses the open tooltip
 *   while focus stays on the trigger. Hover-intent timing prevents flicker on
 *   quick mouse movement. `[kjDisabled]` keeps the tooltip closed. Never put
 *   interactive controls inside the tooltip — use Popover for that.
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
 *   --kj-tooltip-arrow-inset   — Distance from the aligned edge to the arrow when [kjAlign] is start/end.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-tooltip',
  standalone: true,
  imports: [KjTooltipTrigger, KjTooltipContent, KjTooltipArrow, KjTooltipGroup],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTooltip {}
