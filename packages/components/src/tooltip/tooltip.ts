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
 * @doc-is-main
 * @doc-example Default
 *   @doc-file tooltip.example.ts
 * @doc-example Sides
 *   @doc-file tooltip.sides.example.ts
 * @doc-example Delays
 *   @doc-file tooltip.delays.example.ts
 * @doc-example Rich content
 *   @doc-file tooltip.rich.example.ts
 * @doc-example Disabled
 *   @doc-file tooltip.disabled.example.ts
 * @doc-example Grouped
 *   @doc-file tooltip.group.example.ts
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
