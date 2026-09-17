/* CSS DELIVERY — no `styleUrl` in this file, on purpose.
 *
 * `drawer.css` reaches the document exactly once, through
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
import { KjDrawerTitle } from '@kouji-ui/core';

export {
  KjDrawer,
  KjDrawerTitle,
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
 *   aria-labelledby — Set automatically to the id of the projected `<kj-drawer-title>` / `[kjDrawerTitle]`; or pass `ariaLabelledBy` to `open()`
 *   aria-label     — Pass `ariaLabel` to `open()` (or bind `kjAriaLabel` on `<kj-drawer>`) for a body without a title
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
 *   only the topmost overlay receives Escape and outside-click. The drawer is
 *   named by its `<kj-drawer-title>` (`aria-labelledby`); a body without a
 *   heading must pass `ariaLabel` to `open()`. In dev mode a drawer that opens
 *   with neither logs a warning.
 *
 * @doc-related dialog,popover,confirm-popup
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-drawer-shell',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerComponent {}

/**
 * Styled drawer heading. Renders an `<h2 kjDrawerTitle>` so the enclosing
 * `<kj-drawer>` is named by it (`aria-labelledby`).
 *
 * @example
 * ```html
 * <kj-drawer>
 *   <kj-drawer-title>Settings</kj-drawer-title>
 * </kj-drawer>
 * ```
 * @doc-category Library/Overlay
 * @doc
 * @doc-name drawer
 */
@Component({
  selector: 'kj-drawer-title',
  standalone: true,
  imports: [KjDrawerTitle],
  template: `<h2 kjDrawerTitle><ng-content /></h2>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDrawerTitleComponent {}
