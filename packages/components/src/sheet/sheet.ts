import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

export {
  KjSheet,
  KjSheetService,
  KjSheetRef,
  SHEET_DATA,
  SHEET_DETENT,
  SHEET_DISMISSIBLE,
  SHEET_ARIA_LABEL,
  type KjSheetOpenOptions,
  type KjSheetDetent,
} from '@kouji-ui/core';

/**
 * Service-launched **bottom sheet** — a mobile-first, bottom-anchored modal
 * surface with a grab handle and drag-to-dismiss. Inject `KjSheetService` and
 * call `open()` with a body component; the sheet slides up from the bottom
 * edge, traps focus, and locks background scroll. It reuses the same overlay
 * primitive stack as the drawer and dialog — bottom sheet is the mobile
 * composition of that engine, not a new one. The wrapper component exists to
 * host this documentation page.
 *
 * @doc
 * @doc-name sheet
 * @doc-is-main
 * @doc-example Default
 *   A service-launched bottom sheet with a grab handle and drag-to-dismiss.
 *   @doc-file sheet.example.ts
 * @doc-example Detents
 *   `detent` sets the initial resting height — auto / half / full.
 *   @doc-file sheet.detents.example.ts
 * @doc-example Scrollable
 *   A tall body scrolls inside the sheet while the grab handle stays pinned.
 *   @doc-file sheet.scrollable.example.ts
 *
 * @doc-keyboard
 *   Escape    — Closes the sheet (only the topmost overlay when stacked)
 *   Enter / Space — Dismisses when the grab handle is focused
 *   Tab       — Cycles focus within the sheet (focus trap via `tabCycle({ returnFocus: true })`)
 *   Shift+Tab — Cycles backward
 *
 * @doc-aria
 *   role            — "dialog"; `aria-modal="true"` while the backdrop is active
 *   aria-label      — Set via the `ariaLabel` option when no heading is projected
 *   aria-labelledby — Wire to the id of your sheet heading for the accessible name
 *   data-state      — "open" / "closed" — drives the slide-up transform
 *   data-kj-detent  — Mirrors the resolved initial height for theming hooks
 *
 * @doc-css-var
 *   --kj-sheet-bg            — Panel background fill. Defaults to --kj-bg-elevated.
 *   --kj-sheet-fg            — Foreground text color. Defaults to --kj-fg-default.
 *   --kj-sheet-shadow        — Box shadow off the panel. Defaults to --kj-shadow-lg.
 *   --kj-sheet-radius        — Top corner radius. Defaults to --kj-radius-box.
 *   --kj-sheet-max-height    — Cap on the sheet height. Defaults to 92vh.
 *   --kj-sheet-grip-color    — Grab-handle pill color. Defaults to --kj-border-strong.
 *
 * @doc-touch
 *   The grab handle is a ≥ 44px-tall touch target (WCAG 2.5.5) even though the
 *   visible grip pill is small. Downward drag past 40% of the sheet height (or
 *   600 px/s) dismisses. Footer action buttons should use `kj-button`
 *   `size="lg"` (≥ 44px).
 *
 * @doc-a11y
 *   Focus is trapped inside the sheet while open and returned to the triggering
 *   element on close (`returnFocus: true`). Siblings outside the sheet are
 *   marked `inert` while it is open. Stacking is safe — only the topmost overlay
 *   receives Escape and outside-click. The wrapper does not generate an
 *   accessible name; provide one via `aria-labelledby` (a visible heading) or
 *   the `ariaLabel` option. Slide transitions respect
 *   `prefers-reduced-motion`, falling back to an opacity fade.
 *
 * @doc-related drawer,dialog,action-sheet
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-sheet-shell',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './sheet.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSheetComponent {}
