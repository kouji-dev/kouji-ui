import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

export {
  KjDialog,
  KjDialogService,
  KjDialogRef,
  type KjDialogOpenOptions,
} from '@kouji-ui/core';

/**
 * Service-launched modal dialog. Inject `KjDialogService` and call `open()`
 * with a template; mount `[kjDialog]` once near your trigger to host the
 * panel. The wrapper component exists purely to give the dialog suite a
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
 *   aria-labelledby — wire to the id of your `<kj-dialog-title>` so the dialog has an accessible name
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
 *   of background dialogs. The wrapper does not generate an accessible name —
 *   you must provide one via `aria-labelledby` (pointing to a visible heading)
 *   or `aria-label`.
 *
 * @doc-related drawer,popover,confirm-popup
 *
 * @doc
 * @doc-name dialog
 * @doc-is-main
 * @doc-example Default
 *   @doc-file dialog.default.example.ts
 * @doc-example Confirmation
 *   @doc-file dialog.confirmation.example.ts
 * @doc-example Scrollable
 *   @doc-file dialog.scrollable.example.ts
 * @doc-example With form
 *   @doc-file dialog.with-form.example.ts
 * @doc-example Nested overlays
 *   @doc-file dialog.nested.example.ts
 * @doc-category Library/Overlay
 */
@Component({
  selector: 'kj-dialog-shell',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDialogComponent {}
