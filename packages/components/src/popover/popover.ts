import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  KjPopoverTrigger,
  KjPopoverContent,
  KjPopoverArrow,
  KjPopoverClose,
  KjPopoverTitle,
} from '@kouji-ui/core';

export {
  KjPopoverTrigger,
  KjPopoverContent,
  KjPopoverArrow,
  KjPopoverClose,
  KjPopoverTitle,
} from '@kouji-ui/core';

/**
 * Click-triggered popover. Compose `[kjPopoverTrigger]` + `<kj-popover-content [kjFor]="t">`
 * with optional `[kjPopoverTitle]` heading and `[kjPopoverClose]` button. The
 * wrapper itself only projects content — its purpose is to host the docs tags.
 *
 * @doc
 * @doc-name popover
 * @doc-is-main
 * @doc-example Default
 *   A trigger button + content panel — the bare-minimum recipe.
 *   @doc-file popover.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common usages — info panel, side-pinned, and
 *   modal confirmation. Use this as the copy-paste starting point.
 *   @doc-file popover.usage.example.ts
 * @doc-example Sides
 *   `kjSide="top|right|bottom|left"` pins the panel relative to the trigger.
 *   @doc-file popover.sides.example.ts
 * @doc-example Modal
 *   `[kjTrap]="true"` traps focus inside the panel until it closes.
 *   @doc-file popover.modal.example.ts
 * @doc-example Cancellable
 *   `[kjPopoverClose]` on a button dismisses the panel and restores focus.
 *   @doc-file popover.cancellable.example.ts
 * @doc-example With form
 *   Embed inputs inside the panel — focus returns to the trigger on close.
 *   @doc-file popover.with-form.example.ts
 *
 * @doc-keyboard
 *   Enter|Space     — Opens the popover from the trigger
 *   Escape          — Closes the popover and returns focus to the trigger
 *   Tab             — Moves focus through the panel; cycles inside when [kjTrap]="true"
 *   Shift+Tab       — Reverse-cycles focus
 *
 * @doc-aria
 *   aria-haspopup   — Set to "dialog" on the trigger
 *   aria-expanded   — Reflects the open/closed state on the trigger
 *   aria-controls   — Links the trigger to the panel id
 *   role="dialog"   — On the panel (provided via the overlay primitive)
 *   aria-labelledby — Wire to `[kjPopoverTitle]` heading id for an accessible name
 *
 * @doc-touch
 *   Trigger buttons inherit `kj-button` sizing — use `kjSize="md"` or larger
 *   to satisfy WCAG 2.5.5 (44×44). The panel itself is not a touch target.
 *
 * @doc-a11y
 *   The panel is portalled to `document.body` so it escapes clipping
 *   ancestors while staying linked via `aria-controls`. Focus is returned
 *   to the trigger on close, and outside clicks dismiss by default. For
 *   destructive confirmations, set `[kjTrap]="true"` so the user must
 *   commit or cancel via a visible affordance.
 *
 * @doc-related dialog,tooltip,dropdown-menu
 *
 * @doc-css-var
 *   --kj-popover-bg            — Panel background fill. Inherits --kj-bg-elevated.
 *   --kj-popover-fg            — Panel foreground (text) color.
 *   --kj-popover-border-color  — Panel border color. Inherits --kj-border-default.
 *   --kj-popover-radius        — Panel corner radius. Inherits --kj-radius-box.
 *   --kj-popover-padding-x     — Horizontal padding inside the panel.
 *   --kj-popover-padding-y     — Vertical padding inside the panel.
 *   --kj-popover-shadow        — Drop shadow under the panel. Inherits --kj-shadow-md.
 *   --kj-popover-arrow-size    — Edge length of the optional arrow indicator.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-popover',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverArrow, KjPopoverClose, KjPopoverTitle],
  template: `<ng-content />`,
  styleUrl: './popover.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPopoverComponent {}
