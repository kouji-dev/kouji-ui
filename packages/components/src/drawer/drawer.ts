import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

export {
  KjDrawer,
  KjDrawerService,
  KjDrawerRef,
  type KjDrawerOpenOptions,
  type KjDrawerSide,
} from '@kouji-ui/core';

/**
 * Service-launched drawer (edge-anchored panel). Inject `KjDrawerService` and
 * call `open()` with a template; the drawer absorbs the bottom-sheet pattern
 * via `kjSide="bottom"` plus drag options. The wrapper exists to host the
 * documentation page for the drawer suite.
 *
 * @doc
 * @doc-name drawer
 * @doc-is-main
 * @doc-example Default
 *   Service-launched drawer that slides in from the right.
 *   @doc-file drawer.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common drawer usages — open from a button,
 *   change the slide side, and resolve a result back to the opener.
 *   @doc-file drawer.usage.example.ts
 * @doc-example Sides
 *   `kjSide` toggles between left / right / top / bottom (bottom = sheet).
 *   @doc-file drawer.sides.example.ts
 * @doc-example Modal vs non-modal
 *   Toggle the backdrop / inert posture for full-screen vs companion panels.
 *   @doc-file drawer.modal-vs-non-modal.example.ts
 * @doc-example Scrollable
 *   Long body scrolls inside the panel while the header / footer stay pinned.
 *   @doc-file drawer.scrollable.example.ts
 * @doc-example With form
 *   A reactive form lives inside the panel; submit closes with the value.
 *   @doc-file drawer.with-form.example.ts
 *
 * @doc-keyboard
 *   Escape    — Closes the drawer (only the topmost overlay when stacked)
 *   Tab       — Cycles focus within the drawer (focus trap via `tabCycle({ returnFocus: true })`)
 *   Shift+Tab — Cycles backward
 *
 * @doc-aria
 *   role           — "dialog" by default; an `aria-modal="true"` while backdrop is active
 *   aria-labelledby — Wire to the heading id when you project one
 *   aria-describedby — Wire to a description node if the heading is not sufficient
 *   data-state     — "open" / "closed" — drives the slide-in transform
 *   data-kj-side   — Mirrors the resolved side for theme/scope hooks
 *
 * @doc-css-var
 *   --kj-drawer-bg            — Panel background fill. Defaults to --kj-bg-elevated.
 *   --kj-drawer-fg            — Foreground text color. Defaults to --kj-fg-default.
 *   --kj-drawer-border-color  — Color of the edge-facing border. Defaults to --kj-border-default.
 *   --kj-drawer-shadow        — Box shadow off the panel. Defaults to --kj-shadow-lg.
 *   --kj-drawer-size          — Panel width (left/right) or height (top/bottom). Defaults to 22rem.
 *
 * @doc-touch
 *   The panel itself is not a touch target. Header / footer action buttons
 *   should use `kj-button` `size="lg"` (≥ 44px) per WCAG 2.5.5. Bottom sheets
 *   (`kjSide="bottom"`) gain a drag handle when `drag: true` is passed.
 *
 * @doc-a11y
 *   Focus is trapped inside the drawer while open and returned to the
 *   triggering element on close (`returnFocus: true`). Siblings outside the
 *   drawer are marked `inert` while a modal drawer is open. Stacking is safe —
 *   only the topmost overlay receives Escape and outside-click. The wrapper
 *   does not generate an accessible name; provide one via `aria-labelledby`
 *   (pointing to a visible heading) or `aria-label`.
 *
 * @doc-related dialog,popover,confirm-popup
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-drawer-shell',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './drawer.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerComponent {}
