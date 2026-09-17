/* CSS DELIVERY — no `styleUrl` in this file, on purpose.
 *
 * `dialog.css` reaches the document exactly once, through
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
import { KjDialogTitle } from '@kouji-ui/core';

export {
  KjDialog,
  KjDialogTitle,
  KjDialogService,
  KjDialogRef,
  type KjDialogOpenOptions,
} from '@kouji-ui/core';

/**
 * Service-launched modal dialog. Inject `KjDialogService` and call `open()`
 * with a body component that renders `<kj-dialog>`; put the heading in
 * `<kj-dialog-title>` (or `[kjDialogTitle]`) so the dialog is announced by
 * name. The wrapper component exists purely to give the dialog suite a
 * dedicated documentation page.
 *
 * @doc-keyboard
 *   Escape         — Closes the dialog (only the topmost overlay receives Escape when nested)
 *   Tab            — Cycles focus within the dialog (focus trap via `tabCycle({ returnFocus: true })`)
 *   Shift+Tab      — Cycles focus backward, wrapping at the first focusable element
 *
 * @doc-aria
 *   role           — "dialog" by default; the service sets "alertdialog" when opened with `alert: true`
 *   aria-modal     — "true" when a backdrop with `inertSiblings` is active (the default for modal dialogs)
 *   aria-labelledby — set automatically to the id of the projected `<kj-dialog-title>` / `[kjDialogTitle]`; or pass `ariaLabelledBy` to `open()`
 *   aria-label     — pass `ariaLabel` to `open()` (or bind `kjAriaLabel` on `<kj-dialog>`) for a body without a title
 *   aria-describedby — wire to the id of your description node when the title alone is not sufficient
 *
 * @doc-touch
 *   The dialog surface itself is not a touch target. Footer action buttons should use `size="lg"` (44px) to meet WCAG 2.5.5 — the confirmation, scrollable, and with-form examples follow this pattern.
 *
 * @doc-a11y
 *   Focus is trapped inside the dialog while it is open and returned to the
 *   triggering element on close (`returnFocus: true`). Siblings outside the
 *   dialog are marked `inert` while it is open, so assistive tech sees only
 *   the dialog tree. When stacking dialogs (nested overlays), only the topmost
 *   overlay receives Escape and outside-click, preventing accidental dismissal
 *   of background dialogs. The dialog is named by its `<kj-dialog-title>`
 *   (`aria-labelledby`); a body without a heading must pass `ariaLabel` to
 *   `open()`. In dev mode a dialog that opens with neither logs a warning.
 *
 * @doc-related drawer,popover,confirm-popup
 *
 * @doc
 * @doc-name dialog
 * @doc-is-main
 * @doc-example Default
 *   The simplest service-launched dialog — open a body component from a button.
 *   @doc-file dialog.default.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common dialog usages — open a confirmation and
 *   resolve through `afterClosed$`.
 *   @doc-file dialog.usage.example.ts
 * @doc-example Confirmation
 *   Yes/no confirmation with a typed result via `KjDialogRef<T, R>`.
 *   @doc-file dialog.confirmation.example.ts
 * @doc-example Scrollable
 *   Long bodies scroll inside the panel while the header / footer stay pinned.
 *   @doc-file dialog.scrollable.example.ts
 * @doc-example With form
 *   A reactive form lives inside the panel; submit closes with the value.
 *   @doc-file dialog.with-form.example.ts
 * @doc-example Nested overlays
 *   Open another dialog from inside a dialog — only the topmost gets Escape.
 *   @doc-file dialog.nested.example.ts
 *
 * @doc-css-var
 *   --kj-bg-elevated  — Panel background fill. Inherited from the theme.
 *   --kj-radius-box   — Panel corner radius. Inherited from the theme.
 *   --kj-shadow-lg    — Box shadow under the panel. Inherited from the theme.
 *   --kj-space-xl     — Default panel padding.
 *
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-dialog-shell',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogComponent {}

/**
 * Styled dialog heading. Renders an `<h2 kjDialogTitle>` so the enclosing
 * `<kj-dialog>` is named by it (`aria-labelledby`).
 *
 * @example
 * ```html
 * <kj-dialog>
 *   <kj-dialog-title>Save changes?</kj-dialog-title>
 * </kj-dialog>
 * ```
 * @doc-category Library/Overlay
 * @doc
 * @doc-name dialog
 */
@Component({
  selector: 'kj-dialog-title',
  standalone: true,
  imports: [KjDialogTitle],
  template: `<h2 kjDialogTitle><ng-content /></h2>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogTitleComponent {}
