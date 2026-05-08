import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjAlertDialog,
  KjAlertDialogAction,
  KjAlertDialogCancel,
  KjAlertDialogDescription,
  KjAlertDialogOverlay,
  KjAlertDialogTitle,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjAlertDialog` panel directive.
 *
 * Hosts `KjAlertDialog` via `hostDirectives` so consumers retain access to
 * the `exportAs: 'kjAlertDialog'` reference (`<kj-alert-dialog #d="kjAlertDialog">`)
 * and can call `d.close(value?)`. Compose with `<kj-alert-dialog-overlay>`
 * outside, plus `<kj-alert-dialog-title>`, `<kj-alert-dialog-description>`,
 * `<kj-alert-dialog-action>`, and `<kj-alert-dialog-cancel>` inside.
 *
 * Modal lifecycle (overlay-stack registration, body scroll-lock, focus
 * trap, focus restore, cancellable close, default-focus-to-cancel) all live
 * on the underlying `KjAlertDialog` family and are wired by
 * `[kjAlertDialogTrigger]`.
 *
 * @doc-example Default
 *   @doc-file alert-dialog.example.ts
 * @doc-example Destructive
 *   @doc-file alert-dialog.destructive.example.ts
 * @doc-example With form
 *   @doc-file alert-dialog.with-form.example.ts
 * @doc-example Async action
 *   @doc-file alert-dialog.async-action.example.ts
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 * @doc-description A pre-styled, fully accessible alert dialog for destructive or irreversible actions — focus trap, scroll lock, cancel-defaults-to-cancel, and `aria-labelledby`/`aria-describedby` wiring come pre-wired so you can drop in `<kj-alert-dialog>` without reinventing the modal lifecycle.
 * @doc-is-main
 */
@Component({
  selector: 'kj-alert-dialog',
  standalone: true,
  hostDirectives: [KjAlertDialog],
  template: `<ng-content />`,
  styleUrl: './alert-dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert-dialog' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDialogComponent {}

/**
 * Backdrop that wraps the alert-dialog panel. Forwards
 * `kjAlertDialogOverlayCloseOnClick` to the underlying directive. Note that
 * the trigger's `kjAlertDialogDismissOnBackdrop` defaults to `false` — the
 * backdrop will not dismiss the dialog unless explicitly enabled.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Component({
  selector: 'kj-alert-dialog-overlay',
  standalone: true,
  hostDirectives: [
    {
      directive: KjAlertDialogOverlay,
      inputs: ['kjAlertDialogOverlayCloseOnClick: kjAlertDialogOverlayCloseOnClick'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './alert-dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert-dialog-overlay' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDialogOverlayComponent {}

/**
 * Heading of the alert-dialog. Wraps `KjAlertDialogTitle` to register the
 * heading id with the context so `aria-labelledby` is wired automatically.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Component({
  selector: 'kj-alert-dialog-title',
  standalone: true,
  hostDirectives: [KjAlertDialogTitle],
  template: `<ng-content />`,
  styleUrl: './alert-dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert-dialog-title' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDialogTitleComponent {}

/**
 * Long-form description for the alert-dialog. **Required** for the WAI-ARIA
 * Alert Dialog Pattern. Wraps `KjAlertDialogDescription` to register the
 * description id with the context for automatic `aria-describedby` wiring.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Component({
  selector: 'kj-alert-dialog-description',
  standalone: true,
  hostDirectives: [KjAlertDialogDescription],
  template: `<ng-content />`,
  styleUrl: './alert-dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert-dialog-description' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDialogDescriptionComponent {}

/**
 * Footer / action band. Holds the cancel and action buttons in a right-aligned
 * row with consistent spacing. Pure layout — no behaviour.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Component({
  selector: 'kj-alert-dialog-footer',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './alert-dialog.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert-dialog-footer' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDialogFooterComponent {}

/**
 * Confirm/destructive button slot. Click resolves `true`. Wraps
 * `KjAlertDialogAction` so consumers can drop in `<kj-alert-dialog-action>`
 * styled exactly like a `<kj-button>` with `kjVariant="destructive"`.
 *
 * Note: this directive registers itself as the action element in the
 * context, but does not own visual styling — projection inside lets you
 * provide your own `<kj-button>` (recommended) or any other element.
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Component({
  selector: 'kj-alert-dialog-action',
  standalone: true,
  hostDirectives: [KjAlertDialogAction],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert-dialog-action', style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDialogActionComponent {}

/**
 * Cancel button slot. Click resolves `false`. **Receives initial focus** by
 * default (WCAG 3.3.4 *Error Prevention*).
 *
 * @category Library/Actions
 * @doc
 * @doc-name alert-dialog
 */
@Component({
  selector: 'kj-alert-dialog-cancel',
  standalone: true,
  hostDirectives: [KjAlertDialogCancel],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-alert-dialog-cancel', style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAlertDialogCancelComponent {}
