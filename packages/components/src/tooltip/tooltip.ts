import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjTooltipTrigger,
  KjTooltipContent,
  KjTooltipArrow,
  KjTooltipGroup,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjTooltipTrigger` directive.
 *
 * Hosts the trigger directive via `hostDirectives` and forwards every
 * tooltip input under its `kj`-prefixed name. The host renders with
 * `display: contents` so it never interferes with the consumer's layout —
 * the trigger element (typically a button) is projected through.
 *
 * Pair with `<kj-tooltip-content>` inside an `<ng-template>` referenced via
 * `[kjTooltipTriggerFor]`. The content is portal-mounted to `document.body`
 * by the underlying directive, escaping any clipping ancestor.
 *
 * @doc-example Default
 *   @doc-file tooltip.example.ts
 * @doc-example Sides
 *   @doc-file tooltip.sides.example.ts
 * @doc-example Delays
 *   @doc-file tooltip.delays.example.ts
 * @doc-example Rich content
 *   @doc-file tooltip.rich.example.ts
 * @doc-example Group skip-delay
 *   @doc-file tooltip.group.example.ts
 * @doc-example Disabled
 *   @doc-file tooltip.disabled.example.ts
 * @category Library/Feedback
 */
@Component({
  selector: 'kj-tooltip',
  standalone: true,
  hostDirectives: [
    {
      directive: KjTooltipTrigger,
      inputs: [
        'kjTooltipTriggerFor: kjTooltipTriggerFor',
        'kjTooltipDisabled: kjTooltipDisabled',
        'kjTooltipSide: kjTooltipSide',
        'kjTooltipAlign: kjTooltipAlign',
        'kjTooltipOffset: kjTooltipOffset',
        'kjAvoidCollisions: kjAvoidCollisions',
        'kjOpenDelayMs: kjOpenDelayMs',
        'kjCloseDelayMs: kjCloseDelayMs',
        'kjTouchGestures: kjTouchGestures',
        'kjTouchHoldMs: kjTouchHoldMs',
        'kjOpen: kjOpen',
      ],
      outputs: ['kjOpenChange: kjOpenChange'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './tooltip.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tooltip',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTooltipComponent {}

/**
 * Styled wrapper around `KjTooltipContent`.
 *
 * Place inside an `<ng-template>` and reference the template from a
 * `<kj-tooltip>` (or any `[kjTooltipTrigger]`) via `[kjTooltipTriggerFor]`.
 * Hosts `role="tooltip"` and the WCAG 1.4.13 *hoverable* listeners via the
 * underlying directive.
 *
 * Plain projected content only — no buttons, links, inputs. If you need
 * interactive content, use `<kj-popover>` instead.
 *
 * @category Library/Feedback
 */
@Component({
  selector: 'kj-tooltip-content',
  standalone: true,
  hostDirectives: [
    {
      directive: KjTooltipContent,
      inputs: [
        'kjTooltipSide: kjTooltipSide',
        'kjTooltipAlign: kjTooltipAlign',
        'kjTooltipOffset: kjTooltipOffset',
        'kjAvoidCollisions: kjAvoidCollisions',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './tooltip.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-tooltip-content' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTooltipContentComponent {}

/**
 * Decorative arrow rendered inside `<kj-tooltip-content>`. Pure styling hook —
 * the arrow's CSS reads `data-side` from the parent content element. Marked
 * `aria-hidden="true"` by the underlying directive.
 *
 * @category Library/Feedback
 */
@Component({
  selector: 'kj-tooltip-arrow',
  standalone: true,
  hostDirectives: [KjTooltipArrow],
  template: ``,
  styleUrl: './tooltip.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-tooltip-arrow' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTooltipArrowComponent {}

/**
 * Coordinates "skip-delay" timing between sibling tooltips: once one tooltip
 * in the group has been visible recently, the next one in the same group
 * opens with no open-delay. Wraps `KjTooltipGroup` and projects its
 * children — apply to a toolbar / icon-button cluster.
 *
 * @category Library/Feedback
 */
@Component({
  selector: 'kj-tooltip-group',
  standalone: true,
  hostDirectives: [
    {
      directive: KjTooltipGroup,
      outputs: [
        'kjTooltipOpened: kjTooltipOpened',
        'kjTooltipClosed: kjTooltipClosed',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './tooltip.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tooltip-group',
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTooltipGroupComponent {}
